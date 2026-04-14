-- =============================================================================
-- Cursaas — White-Label: tabela faculdade_temas (1:1 com faculdades)
-- MySQL 8+ / InnoDB
--
-- Substitui: migration_white_label_tema.sql
-- Motivo: normalização — dados de tema ficam isolados em tabela própria,
--         facilitando cache, auditoria e extensão futura.
--
-- Execução:
--   1. Rode este arquivo UMA VEZ em cada ambiente.
--   2. Se você já rodou migration_white_label_tema.sql, esta migration
--      remove as colunas que foram adicionadas diretamente em faculdades.
-- =============================================================================

USE cursaas;


-- ---------------------------------------------------------------------------
-- PASSO 1 — Remover colunas de tema adicionadas diretamente em faculdades
--           (migração white_label_tema.sql anterior).
--           Só executa se as colunas existirem (procedimento seguro).
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS _cursaas_remove_tema_columns;

DELIMITER $$
CREATE PROCEDURE _cursaas_remove_tema_columns()
BEGIN
    -- primary_color
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'faculdades'
          AND COLUMN_NAME  = 'primary_color'
    ) THEN
        ALTER TABLE faculdades DROP COLUMN primary_color;
    END IF;

    -- secondary_color
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'faculdades'
          AND COLUMN_NAME  = 'secondary_color'
    ) THEN
        ALTER TABLE faculdades DROP COLUMN secondary_color;
    END IF;

    -- background_color
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'faculdades'
          AND COLUMN_NAME  = 'background_color'
    ) THEN
        ALTER TABLE faculdades DROP COLUMN background_color;
    END IF;

    -- font_family
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'faculdades'
          AND COLUMN_NAME  = 'font_family'
    ) THEN
        ALTER TABLE faculdades DROP COLUMN font_family;
    END IF;
END$$
DELIMITER ;

CALL _cursaas_remove_tema_columns();
DROP PROCEDURE IF EXISTS _cursaas_remove_tema_columns;


-- ---------------------------------------------------------------------------
-- PASSO 2 — Criar tabela faculdade_temas
--
-- Relação:  faculdades 1 ──── 0..1  faculdade_temas
--           Um tema é criado automaticamente (INSERT abaixo) ou via API.
--           ON DELETE CASCADE: ao remover a faculdade remove o tema junto.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS faculdade_temas (

    -- Chave primária coincide com faculdade_id (PK = FK → 1:1 garantido)
    faculdade_id     INT            NOT NULL,

    -- Visual
    primary_color    VARCHAR(20)    NOT NULL  DEFAULT '#1a6b3c'
                     COMMENT 'Cor principal — hex ou CSS color. Ex: #1a6b3c',

    secondary_color  VARCHAR(20)    NOT NULL  DEFAULT '#0f4b2a'
                     COMMENT 'Cor de destaque/hover. Ex: #0f4b2a',

    background_color VARCHAR(20)    NOT NULL  DEFAULT '#f0fdf4'
                     COMMENT 'Fundo geral da plataforma. Ex: #f0fdf4',

    font_family      VARCHAR(150)   NOT NULL  DEFAULT 'Inter, system-ui, sans-serif'
                     COMMENT 'Font-stack CSS. Ex: "Inter, system-ui, sans-serif"',

    -- logo_url fica em faculdades (já existia) — aqui armazenamos
    -- sobreposição de logo para contextos específicos (email, app mobile)
    logo_url_override VARCHAR(500)  NULL
                     COMMENT 'Override de logo. Se NULL usa faculdades.logo_url',

    -- Timestamps
    criado_em        TIMESTAMP      NOT NULL  DEFAULT CURRENT_TIMESTAMP,
    atualizado_em    TIMESTAMP      NOT NULL  DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    -- -----------------------------------------------------------------------
    -- Constraints
    -- -----------------------------------------------------------------------

    -- PK = FK: uma linha por faculdade, relação 1:1 forçada no nível do banco
    PRIMARY KEY (faculdade_id),

    CONSTRAINT fk_faculdade_temas_faculdade
        FOREIGN KEY (faculdade_id)
        REFERENCES faculdades (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tema visual white-label por faculdade (tenant). Relação 1:1 com faculdades.';


-- ---------------------------------------------------------------------------
-- PASSO 3 — Índice extra para buscas por cor (útil para painel admin)
-- ---------------------------------------------------------------------------

CREATE INDEX idx_ftemas_primary_color
    ON faculdade_temas (primary_color);


-- ---------------------------------------------------------------------------
-- PASSO 4 — INSERT de exemplos com 3 faculdades fictícias
-- ---------------------------------------------------------------------------

-- Garante que as faculdades de exemplo existem (sem erro se já existirem)
INSERT IGNORE INTO faculdades
    (id, nome,                       slug,         plano,          ativa, aprovada)
VALUES
    (1,  'Uninove EAD',              'uninove',    'enterprise',   TRUE,  TRUE),
    (2,  'Faculdade Nova Era',       'nova-era',   'profissional', TRUE,  TRUE),
    (3,  'Instituto Tech Brasil',    'itb',        'basico',       TRUE,  TRUE);


-- Temas específicos por faculdade (ON DUPLICATE KEY para ser idempotente)
INSERT INTO faculdade_temas
    (faculdade_id, primary_color, secondary_color, background_color, font_family,             logo_url_override)
VALUES
    -- Uninove: azul corporativo
    (1,            '#1e3a8a',     '#1e40af',        '#eff6ff',        'Inter, system-ui, sans-serif',
                   'https://cdn.uninove.br/logo-ead.svg'),

    -- Nova Era: verde esmeralda
    (2,            '#065f46',     '#047857',        '#ecfdf5',        '"Nunito", sans-serif',
                   NULL),

    -- ITB: roxo tech
    (3,            '#6d28d9',     '#7c3aed',        '#f5f3ff',        '"JetBrains Mono", monospace',
                   'https://itb.edu.br/assets/logo.png')

ON DUPLICATE KEY UPDATE
    primary_color    = VALUES(primary_color),
    secondary_color  = VALUES(secondary_color),
    background_color = VALUES(background_color),
    font_family      = VALUES(font_family),
    logo_url_override = VALUES(logo_url_override);


-- ---------------------------------------------------------------------------
-- PASSO 5 — View de conveniência (faculdade + tema em uma só leitura)
--           Usada pelo endpoint GET /faculdades/minha/tema
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_faculdade_com_tema AS
SELECT
    f.id                            AS faculdade_id,
    f.nome,
    f.slug,
    f.ativa,
    f.aprovada,
    f.plano,
    -- Logo: usa override do tema se existir, senão usa faculdades.logo_url
    COALESCE(t.logo_url_override, f.logo_url) AS logo_url,
    COALESCE(t.primary_color,    '#1a6b3c')   AS primary_color,
    COALESCE(t.secondary_color,  '#0f4b2a')   AS secondary_color,
    COALESCE(t.background_color, '#f0fdf4')   AS background_color,
    COALESCE(t.font_family,      'Inter, system-ui, sans-serif') AS font_family,
    t.criado_em                     AS tema_criado_em,
    t.atualizado_em                 AS tema_atualizado_em
FROM faculdades f
LEFT JOIN faculdade_temas t ON t.faculdade_id = f.id;


-- ---------------------------------------------------------------------------
-- Verificação final
-- ---------------------------------------------------------------------------

SELECT
    'faculdade_temas criada' AS status,
    COUNT(*) AS registros
FROM faculdade_temas;
