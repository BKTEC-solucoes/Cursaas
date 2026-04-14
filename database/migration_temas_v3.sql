-- =============================================================================
-- Cursaas — White-Label v3: múltiplos temas + dark mode + favicon
-- MySQL 8+ / InnoDB
--
-- Evolui faculdade_temas de relação 1:1 para 1:N, adicionando:
--   · id INT AUTO_INCREMENT como PK
--   · nome do tema
--   · dark mode (flag + variantes de cor)
--   · favicon_url
--   · faculdades.tema_ativo_id (FK para o tema em uso)
--
-- Pré-requisito: migration_faculdade_temas_v2.sql já executada.
-- =============================================================================

USE cursaas;


-- ---------------------------------------------------------------------------
-- PASSO 1 — Adicionar colunas à tabela faculdade_temas preservando dados
-- ---------------------------------------------------------------------------

--  A tabela atual tem faculdade_id como PRIMARY KEY (1:1).
--  Precisamos:
--    a) Adicionar id INT como nova PK com AUTO_INCREMENT
--    b) Liberar faculdade_id para repetição (1:N)
--    c) Adicionar novas colunas

-- 1a. Adiciona a coluna id (sem auto_increment ainda, MySQL exige PK primeiro)
ALTER TABLE faculdade_temas
    ADD COLUMN id INT NOT NULL DEFAULT 0 FIRST,
    ADD COLUMN nome VARCHAR(100) NOT NULL DEFAULT 'Tema Padrão',
    ADD COLUMN dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN dark_primary_color VARCHAR(20) NOT NULL DEFAULT '#34d399',
    ADD COLUMN dark_secondary_color VARCHAR(20) NOT NULL DEFAULT '#10b981',
    ADD COLUMN dark_background_color VARCHAR(20) NOT NULL DEFAULT '#0f172a',
    ADD COLUMN favicon_url VARCHAR(500) NULL;

-- 1b. Preenche id com valores sequenciais antes de torná-lo PK
SET @rn = 0;
UPDATE faculdade_temas SET id = (@rn := @rn + 1);

-- 1c. Troca a PK (de faculdade_id para id)
ALTER TABLE faculdade_temas DROP PRIMARY KEY;
ALTER TABLE faculdade_temas MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY;

-- 1d. Reconstrói o índice em faculdade_id (virou FK normal, sem unicidade)
ALTER TABLE faculdade_temas
    ADD INDEX idx_faculdade_temas_faculdade (faculdade_id),
    ADD CONSTRAINT fk_faculdade_temas_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)
        ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- PASSO 2 — Adicionar tema_ativo_id em faculdades e popular
-- ---------------------------------------------------------------------------

ALTER TABLE faculdades
    ADD COLUMN tema_ativo_id INT NULL
        COMMENT 'FK para faculdade_temas.id — tema visual ativo desta faculdade';

-- Aponta cada faculdade para seu único tema existente
UPDATE faculdades f
    JOIN faculdade_temas t ON t.faculdade_id = f.id
    SET f.tema_ativo_id = t.id;

-- Constraint adicionada depois do UPDATE para evitar problema de integridade circular
ALTER TABLE faculdades
    ADD CONSTRAINT fk_faculdades_tema_ativo
        FOREIGN KEY (tema_ativo_id) REFERENCES faculdade_temas(id)
        ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- PASSO 3 — Tabela de presets de tema (somente leitura via API)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tema_presets (
    id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100)  NOT NULL,
    preview_color   VARCHAR(20)   NOT NULL COMMENT 'Cor representativa para miniatura',
    primary_color   VARCHAR(20)   NOT NULL,
    secondary_color VARCHAR(20)   NOT NULL,
    background_color VARCHAR(20)  NOT NULL,
    font_family     VARCHAR(150)  NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    -- dark variants
    dark_primary_color    VARCHAR(20) NOT NULL DEFAULT '#34d399',
    dark_secondary_color  VARCHAR(20) NOT NULL DEFAULT '#10b981',
    dark_background_color VARCHAR(20) NOT NULL DEFAULT '#0f172a'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tema_presets
    (nome, preview_color, primary_color, secondary_color, background_color, font_family,
     dark_primary_color, dark_secondary_color, dark_background_color)
VALUES
    ('Verde Esmeralda', '#1a6b3c', '#1a6b3c', '#0f4b2a', '#f0fdf4', 'Inter, system-ui, sans-serif',
     '#34d399', '#10b981', '#0f172a'),

    ('Azul Oceano',     '#1e40af', '#1e40af', '#1e3a8a', '#eff6ff', '"Inter", system-ui, sans-serif',
     '#60a5fa', '#3b82f6', '#0f172a'),

    ('Roxo Royal',      '#7c3aed', '#7c3aed', '#5b21b6', '#f5f3ff', 'Poppins, sans-serif',
     '#a78bfa', '#8b5cf6', '#1e1b2e'),

    ('Vermelho Coral',  '#dc2626', '#dc2626', '#b91c1c', '#fef2f2', '"Open Sans", sans-serif',
     '#f87171', '#ef4444', '#1a0000'),

    ('Laranja Sunset',  '#ea580c', '#ea580c', '#c2410c', '#fff7ed', 'Montserrat, sans-serif',
     '#fb923c', '#f97316', '#1c1007'),

    ('Cinza Moderno',   '#374151', '#374151', '#1f2937', '#f9fafb', '"Source Sans Pro", sans-serif',
     '#9ca3af', '#6b7280', '#111827');


-- ---------------------------------------------------------------------------
-- PASSO 4 — View unificada para leitura rápida (compatibilidade com v2)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_faculdade_com_tema AS
SELECT
    f.id                AS faculdade_id,
    f.nome              AS faculdade_nome,
    f.slug,
    f.logo_url,
    f.tema_ativo_id,
    COALESCE(t.nome, 'Padrão')        AS tema_nome,
    COALESCE(t.primary_color,    '#1a6b3c')                      AS primary_color,
    COALESCE(t.secondary_color,  '#0f4b2a')                      AS secondary_color,
    COALESCE(t.background_color, '#f0fdf4')                      AS background_color,
    COALESCE(t.font_family,      'Inter, system-ui, sans-serif') AS font_family,
    COALESCE(t.dark_mode,        FALSE)                          AS dark_mode,
    COALESCE(t.dark_primary_color,    '#34d399') AS dark_primary_color,
    COALESCE(t.dark_secondary_color,  '#10b981') AS dark_secondary_color,
    COALESCE(t.dark_background_color, '#0f172a') AS dark_background_color,
    COALESCE(t.logo_url_override, f.logo_url)    AS logo_url_efetiva,
    t.favicon_url
FROM  faculdades f
LEFT  JOIN faculdade_temas t ON t.id = f.tema_ativo_id;
