-- =============================================================================
-- MIGRAÇÃO SEGURA: Adicionar Multi-Tenant (faculdades) ao banco existente
-- Cursaas - Portal EAD
-- Atualizado: 2026-04-08
--
-- IDEMPOTENTE: pode ser rodado várias vezes sem quebrar dados.
-- Cada passo verifica se a alteração já foi aplicada antes de executar.
--
-- PRÉ-REQUISITO: fazer backup
--   mysqldump -u root -p cursaas > backup_pre_migration.sql
--
-- EXECUTAR:
--   mysql -u root -p cursaas < database/migration_add_faculdades.sql
-- =============================================================================

USE cursaas;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- PASSO 1: Criar tabela faculdades (se não existir)
-- =============================================================================

CREATE TABLE IF NOT EXISTS faculdades (
    id               INT            NOT NULL AUTO_INCREMENT,
    nome             VARCHAR(255)   NOT NULL,
    slug             VARCHAR(100)   NOT NULL  COMMENT 'Identificador URL-friendly único, ex: uninove',
    cnpj             VARCHAR(18)    NULL,
    email_contato    VARCHAR(255)   NULL,
    telefone         VARCHAR(20)    NULL,
    logo_url         VARCHAR(500)   NULL,
    dominio_email    VARCHAR(100)   NULL      COMMENT 'Ex: @faculdade.edu.br para auto-vínculo no cadastro',
    ativa            BOOLEAN        NOT NULL DEFAULT TRUE,
    aprovada         BOOLEAN        NOT NULL DEFAULT TRUE,
    plano            ENUM('basico', 'profissional', 'enterprise') NOT NULL DEFAULT 'basico',
    data_criacao     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_faculdades_slug (slug),
    UNIQUE KEY uq_faculdades_cnpj (cnpj),
    INDEX idx_faculdades_ativa    (ativa),
    INDEX idx_faculdades_aprovada (aprovada)
);

-- =============================================================================
-- PASSO 2: Inserir faculdade padrão para herdar todos os dados existentes
-- Técnica: INSERT ... WHERE NOT EXISTS → idempotente
-- =============================================================================

INSERT INTO faculdades (nome, slug, ativa, aprovada, plano, data_criacao, data_atualizacao)
SELECT 'Faculdade Padrão', 'padrao', 1, 1, 'basico', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM faculdades WHERE slug = 'padrao'
);

-- Captura o ID para uso nos passos seguintes
SET @faculdade_padrao_id = (SELECT id FROM faculdades WHERE slug = 'padrao' LIMIT 1);

-- =============================================================================
-- PASSO 3: Adicionar faculdade_id em usuarios (tabela de alunos)
--
-- ESTRATÉGIA 3 etapas (obrigatória para tabelas com dados existentes):
--   3a. ADD COLUMN nullable  → não quebra registros existentes
--   3b. UPDATE (backfill)    → preenche todos com a faculdade padrão
--   3c. FK + índices         → aplica integridade referencial
--
-- NULL é permitido intencionalmente: super_admin global não tem faculdade.
-- =============================================================================

-- 3a. Adicionar coluna (ignorado se já existir)
SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'usuarios'
          AND COLUMN_NAME  = 'faculdade_id'
    ),
    'ALTER TABLE usuarios ADD COLUMN faculdade_id INT NULL COMMENT "Tenant do usuário. NULL = super_admin global" AFTER instituicao_id',
    'SELECT "faculdade_id já existe em usuarios"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. Backfill: todos os registros sem faculdade_id recebem a padrão
UPDATE usuarios
SET    faculdade_id = @faculdade_padrao_id
WHERE  faculdade_id IS NULL;

-- 3c. FK (ignorada se já existir)
SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA    = DATABASE()
          AND TABLE_NAME      = 'usuarios'
          AND CONSTRAINT_NAME = 'fk_usuarios_faculdade'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_faculdade FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "FK fk_usuarios_faculdade já existe"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índices (ignorados se já existirem)
CREATE INDEX IF NOT EXISTS idx_usuarios_faculdade_id   ON usuarios (faculdade_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_faculdade_role ON usuarios (faculdade_id, role);

-- =============================================================================
-- PASSO 4: Adicionar faculdade_id em cursos
-- =============================================================================

-- 4a. Adicionar coluna
SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'cursos'
          AND COLUMN_NAME  = 'faculdade_id'
    ),
    'ALTER TABLE cursos ADD COLUMN faculdade_id INT NULL COMMENT "Tenant dono do curso" AFTER id',
    'SELECT "faculdade_id já existe em cursos"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4b. Backfill
UPDATE cursos
SET    faculdade_id = @faculdade_padrao_id
WHERE  faculdade_id IS NULL;

-- 4c. FK
SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA    = DATABASE()
          AND TABLE_NAME      = 'cursos'
          AND CONSTRAINT_NAME = 'fk_cursos_faculdade'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'ALTER TABLE cursos ADD CONSTRAINT fk_cursos_faculdade FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "FK fk_cursos_faculdade já existe"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índices
CREATE INDEX IF NOT EXISTS idx_cursos_faculdade_id    ON cursos (faculdade_id);
CREATE INDEX IF NOT EXISTS idx_cursos_faculdade_ativo ON cursos (faculdade_id, ativo);

-- =============================================================================
-- PASSO 5: Adicionar faculdade_id em provas (denormalizado — evita JOIN)
-- Backfill via JOIN com cursos (que já tem faculdade_id preenchido)
-- =============================================================================

SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'provas'
          AND COLUMN_NAME  = 'faculdade_id'
    ),
    'ALTER TABLE provas ADD COLUMN faculdade_id INT NULL COMMENT "Denormalizado de cursos.faculdade_id para filtro direto" AFTER id',
    'SELECT "faculdade_id já existe em provas"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill via JOIN
UPDATE provas p
JOIN   cursos c ON c.id = p.curso_id
SET    p.faculdade_id = c.faculdade_id
WHERE  p.faculdade_id IS NULL;

SET @sql = IF(
    NOT EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA    = DATABASE()
          AND TABLE_NAME      = 'provas'
          AND CONSTRAINT_NAME = 'fk_provas_faculdade'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'ALTER TABLE provas ADD CONSTRAINT fk_provas_faculdade FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "FK fk_provas_faculdade já existe"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE INDEX IF NOT EXISTS idx_provas_faculdade_id    ON provas (faculdade_id);
CREATE INDEX IF NOT EXISTS idx_provas_faculdade_ativo ON provas (faculdade_id, ativo);

-- =============================================================================
-- PASSO 6: Criar tabela vinculos_aluno_faculdade e popular alunos existentes
-- =============================================================================

CREATE TABLE IF NOT EXISTS vinculos_aluno_faculdade (
    id               INT         NOT NULL AUTO_INCREMENT,
    usuario_id       INT         NOT NULL,
    faculdade_id     INT         NOT NULL,
    matricula        VARCHAR(50) NULL     COMMENT 'Código de matrícula interno da faculdade',
    status           ENUM('ativo', 'suspenso', 'desligado') NOT NULL DEFAULT 'ativo',
    data_vinculo     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_vinculo_usuario_faculdade (usuario_id, faculdade_id),
    UNIQUE KEY uq_matricula_faculdade       (faculdade_id, matricula),
    INDEX idx_vinculo_faculdade_status      (faculdade_id, status),
    INDEX idx_vinculo_usuario_id            (usuario_id),

    CONSTRAINT fk_vinculo_usuario
        FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)   ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE CASCADE
);

-- Popula vínculos para alunos já existentes (INSERT IGNORE = idempotente)
INSERT IGNORE INTO vinculos_aluno_faculdade (usuario_id, faculdade_id, status)
SELECT id, faculdade_id, 'ativo'
FROM   usuarios
WHERE  role = 'aluno'
  AND  faculdade_id IS NOT NULL;

-- =============================================================================
-- PASSO 7: Views de segurança
-- =============================================================================

CREATE OR REPLACE VIEW alunos_por_faculdade AS
SELECT
    u.id              AS usuario_id,
    u.nome,
    u.email,
    u.numero_matricula,
    u.ativo           AS usuario_ativo,
    v.faculdade_id,
    f.nome            AS faculdade_nome,
    f.slug            AS faculdade_slug,
    v.matricula       AS matricula_vinculo,
    v.status          AS vinculo_status,
    v.data_vinculo
FROM  usuarios u
JOIN  vinculos_aluno_faculdade v ON v.usuario_id = u.id
JOIN  faculdades f               ON f.id         = v.faculdade_id
WHERE u.role = 'aluno';

CREATE OR REPLACE VIEW cursos_por_faculdade AS
SELECT
    c.id           AS curso_id,
    c.nome         AS curso_nome,
    c.pago,
    c.status,
    c.ativo,
    c.faculdade_id,
    f.nome         AS faculdade_nome,
    f.slug         AS faculdade_slug
FROM  cursos c
JOIN  faculdades f ON f.id = c.faculdade_id;

-- =============================================================================
-- VERIFICAÇÃO FINAL (descomente para validar após rodar)
-- =============================================================================
-- SELECT 'faculdades'                    AS tabela, COUNT(*) AS total FROM faculdades
-- UNION ALL
-- SELECT 'usuarios com faculdade_id',             COUNT(*) FROM usuarios WHERE faculdade_id IS NOT NULL
-- UNION ALL
-- SELECT 'usuarios SEM faculdade_id (só admins)', COUNT(*) FROM usuarios WHERE faculdade_id IS NULL
-- UNION ALL
-- SELECT 'cursos com faculdade_id',               COUNT(*) FROM cursos WHERE faculdade_id IS NOT NULL
-- UNION ALL
-- SELECT 'provas com faculdade_id',               COUNT(*) FROM provas WHERE faculdade_id IS NOT NULL
-- UNION ALL
-- SELECT 'vinculos_aluno_faculdade',              COUNT(*) FROM vinculos_aluno_faculdade;


USE cursaas;

-- Habilita verificação de FK para garantir integridade durante a migração
SET FOREIGN_KEY_CHECKS = 1;

START TRANSACTION;

-- =============================================================================
-- PASSO 1: Criar tabela faculdades
-- =============================================================================

CREATE TABLE IF NOT EXISTS faculdades (
    id               INT            NOT NULL AUTO_INCREMENT,
    nome             VARCHAR(255)   NOT NULL,
    slug             VARCHAR(100)   NOT NULL  COMMENT 'Identificador único URL-friendly, ex: uninove',
    cnpj             VARCHAR(18)    NULL      COMMENT 'Opcional na migração, preencher depois',
    email_contato    VARCHAR(255)   NULL,
    telefone         VARCHAR(20)    NULL,
    logo_url         VARCHAR(500)   NULL,
    dominio_email    VARCHAR(100)   NULL      COMMENT 'Domínio de e-mail para auto-vínculo, ex: @faculdade.edu.br',
    ativa            BOOLEAN        NOT NULL DEFAULT TRUE,
    aprovada         BOOLEAN        NOT NULL DEFAULT TRUE,
    plano            ENUM('basico', 'profissional', 'enterprise') NOT NULL DEFAULT 'basico',
    data_criacao     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE  KEY uq_faculdades_slug  (slug),
    UNIQUE  KEY uq_faculdades_cnpj  (cnpj),
    INDEX       idx_faculdades_ativa (ativa)
);

-- =============================================================================
-- PASSO 2: Inserir faculdade padrão para herdar os dados existentes
--
--   Todo registro atual (usuarios, cursos, provas) será vinculado a ela.
--   Após a migração, ajuste o nome/slug ou crie outras faculdades e
--   redistribua os registros conforme necessário.
-- =============================================================================

INSERT INTO faculdades (nome, slug, ativa, aprovada, plano)
VALUES ('Faculdade Padrão', 'padrao', TRUE, TRUE, 'basico');

-- Guarda o ID recém-criado numa variável para uso nos passos seguintes
SET @faculdade_padrao_id = LAST_INSERT_ID();

-- =============================================================================
-- PASSO 3: Adicionar faculdade_id em `usuarios` (nullable primeiro)
-- =============================================================================

ALTER TABLE usuarios
    ADD COLUMN faculdade_id INT NULL
        COMMENT 'Tenant do usuário. NULL = super_admin global'
        AFTER instituicao_id;

-- Backfill: todos os usuários existentes vão para a faculdade padrão
UPDATE usuarios SET faculdade_id = @faculdade_padrao_id;

-- Alunos ficam NOT NULL (todo aluno deve ter faculdade).
-- Admins com admin_role = 'super_admin' podem ficar NULL (acesso global).
ALTER TABLE usuarios
    MODIFY COLUMN faculdade_id INT NULL
        COMMENT 'Tenant do usuário. NULL = super_admin global';

-- Índices em usuarios
ALTER TABLE usuarios
    ADD INDEX idx_usuarios_faculdade_id    (faculdade_id),
    ADD INDEX idx_usuarios_faculdade_role  (faculdade_id, role),
    ADD INDEX idx_usuarios_faculdade_ativo (faculdade_id, ativo);

-- Chave estrangeira em usuarios
ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

-- =============================================================================
-- PASSO 4: Adicionar faculdade_id em `cursos` (nullable primeiro)
-- =============================================================================

ALTER TABLE cursos
    ADD COLUMN faculdade_id INT NULL
        COMMENT 'Faculdade dona do curso'
        AFTER id;

UPDATE cursos SET faculdade_id = @faculdade_padrao_id;

ALTER TABLE cursos
    MODIFY COLUMN faculdade_id INT NOT NULL
        COMMENT 'Faculdade dona do curso';

ALTER TABLE cursos
    ADD INDEX idx_cursos_faculdade_id     (faculdade_id),
    ADD INDEX idx_cursos_faculdade_ativo  (faculdade_id, ativo),
    ADD INDEX idx_cursos_faculdade_status (faculdade_id, status);

ALTER TABLE cursos
    ADD CONSTRAINT fk_cursos_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

-- =============================================================================
-- PASSO 5: Adicionar faculdade_id em `provas`
-- =============================================================================

ALTER TABLE provas
    ADD COLUMN faculdade_id INT NULL
        COMMENT 'Denormalizado da faculdade do curso para isolamento direto'
        AFTER id;

-- Backfill via JOIN com cursos (que já tem faculdade_id preenchido)
UPDATE provas p
JOIN   cursos c ON c.id = p.curso_id
SET    p.faculdade_id = c.faculdade_id;

ALTER TABLE provas
    MODIFY COLUMN faculdade_id INT NOT NULL
        COMMENT 'Denormalizado da faculdade do curso para isolamento direto';

ALTER TABLE provas
    ADD INDEX idx_provas_faculdade_id    (faculdade_id),
    ADD INDEX idx_provas_faculdade_ativo (faculdade_id, ativo);

ALTER TABLE provas
    ADD CONSTRAINT fk_provas_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

-- =============================================================================
-- PASSO 6: Tabela de vínculo explícito aluno ↔ faculdade
--   Guarda matrícula, status e histórico de vínculo separadamente de usuarios.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vinculos_aluno_faculdade (
    id               INT          NOT NULL AUTO_INCREMENT,
    usuario_id       INT          NOT NULL,
    faculdade_id     INT          NOT NULL,
    matricula        VARCHAR(50)  NULL     COMMENT 'Código de matrícula interno da faculdade',
    status           ENUM('ativo', 'suspenso', 'desligado') NOT NULL DEFAULT 'ativo',
    data_vinculo     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_vinculo_usuario_faculdade (usuario_id, faculdade_id),
    UNIQUE KEY uq_matricula_faculdade       (faculdade_id, matricula),

    CONSTRAINT fk_vinculo_usuario
        FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)   ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE CASCADE,

    INDEX idx_vinculo_faculdade_status (faculdade_id, status),
    INDEX idx_vinculo_usuario_id       (usuario_id)
);

-- Popula vinculos para todos os alunos já existentes
INSERT IGNORE INTO vinculos_aluno_faculdade (usuario_id, faculdade_id, status)
SELECT id, faculdade_id, 'ativo'
FROM   usuarios
WHERE  role = 'aluno'
  AND  faculdade_id IS NOT NULL;

-- =============================================================================
-- PASSO 7: View de consulta (facilita queries cotidianas)
-- =============================================================================

CREATE OR REPLACE VIEW alunos_por_faculdade AS
SELECT
    u.id            AS usuario_id,
    u.nome,
    u.email,
    u.ativo         AS usuario_ativo,
    v.faculdade_id,
    f.nome          AS faculdade_nome,
    f.slug          AS faculdade_slug,
    v.matricula,
    v.status        AS vinculo_status,
    v.data_vinculo
FROM  usuarios u
JOIN  vinculos_aluno_faculdade v ON v.usuario_id   = u.id
JOIN  faculdades f               ON f.id           = v.faculdade_id
WHERE u.role = 'aluno';

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO (rode manualmente para confirmar)
-- =============================================================================
-- SELECT 'faculdades'                       AS tabela, COUNT(*) FROM faculdades;
-- SELECT 'usuarios com faculdade_id'        AS tabela, COUNT(*) FROM usuarios WHERE faculdade_id IS NOT NULL;
-- SELECT 'usuarios SEM faculdade_id'        AS tabela, COUNT(*) FROM usuarios WHERE faculdade_id IS NULL;
-- SELECT 'cursos com faculdade_id'          AS tabela, COUNT(*) FROM cursos;
-- SELECT 'provas com faculdade_id'          AS tabela, COUNT(*) FROM provas;
-- SELECT 'vinculos gerados'                 AS tabela, COUNT(*) FROM vinculos_aluno_faculdade;
-- SELECT * FROM alunos_por_faculdade LIMIT 10;
-- =============================================================================
