-- =============================================================================
-- MIGRAÇÃO: Sistema Multi-Tenant por Faculdade
-- Cursaas - Portal EAD
-- =============================================================================
-- Estratégia: cada faculdade é um tenant isolado.
-- O campo faculdade_id em cada tabela principal garante o isolamento.
-- A tabela `instituicoes` existente é aproveitada e estendida como `faculdades`.
-- =============================================================================

USE cursaas;

-- -----------------------------------------------------------------------------
-- 1. TABELA DE FACULDADES (evolução de `instituicoes`)
--    Representa cada tenant do sistema.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS faculdades (
    id               INT            PRIMARY KEY AUTO_INCREMENT,
    nome             VARCHAR(255)   NOT NULL,
    slug             VARCHAR(100)   NOT NULL COMMENT 'Identificador único URL-friendly, ex: uninove',
    cnpj             VARCHAR(18)    UNIQUE NOT NULL,
    email_contato    VARCHAR(255)   NOT NULL,
    telefone         VARCHAR(20)    NULL,
    endereco         VARCHAR(500)   NULL,
    logo_url         VARCHAR(500)   NULL,
    dominio_email    VARCHAR(100)   NULL COMMENT 'Ex: @faculdade.edu.br para validação de cadastro',
    ativa            BOOLEAN        NOT NULL DEFAULT FALSE,
    aprovada         BOOLEAN        NOT NULL DEFAULT FALSE,
    plano            ENUM('basico', 'profissional', 'enterprise') NOT NULL DEFAULT 'basico',
    max_alunos       INT            NULL     COMMENT 'Limite de alunos do plano (NULL = ilimitado)',
    data_criacao     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE  KEY uq_faculdades_slug         (slug),
    UNIQUE  KEY uq_faculdades_cnpj         (cnpj),
    INDEX       idx_faculdades_ativa        (ativa),
    INDEX       idx_faculdades_aprovada     (aprovada),
    INDEX       idx_faculdades_plano        (plano)
);

-- -----------------------------------------------------------------------------
-- 2. COLUNA faculdade_id EM usuarios
--    Os usuários já têm instituicao_id; adicionamos faculdade_id como coluna
--    definitiva. Em produção, migrar os dados de instituicao_id → faculdade_id.
-- -----------------------------------------------------------------------------

ALTER TABLE usuarios
    ADD COLUMN faculdade_id INT NULL
        COMMENT 'Tenant do usuário (NULL apenas para super_admin global)'
        AFTER instituicao_id,
    ADD CONSTRAINT fk_usuarios_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT,
    ADD INDEX idx_usuarios_faculdade_id (faculdade_id);

-- Índice composto para queries por tenant + role (listagem de alunos/admins)
ALTER TABLE usuarios
    ADD INDEX idx_usuarios_faculdade_role (faculdade_id, role),
    ADD INDEX idx_usuarios_faculdade_ativo (faculdade_id, ativo);

-- -----------------------------------------------------------------------------
-- 3. COLUNA faculdade_id EM cursos
--    Cursos são criados por admins de uma faculdade específica.
-- -----------------------------------------------------------------------------

ALTER TABLE cursos
    ADD COLUMN faculdade_id INT NOT NULL
        COMMENT 'Faculdade dona do curso'
        AFTER id,
    ADD CONSTRAINT fk_cursos_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT;

-- Índice composto: listar cursos de uma faculdade filtrando por status/ativo
ALTER TABLE cursos
    ADD INDEX idx_cursos_faculdade_id       (faculdade_id),
    ADD INDEX idx_cursos_faculdade_ativo    (faculdade_id, ativo),
    ADD INDEX idx_cursos_faculdade_status   (faculdade_id, status);

-- -----------------------------------------------------------------------------
-- 4. COLUNA faculdade_id EM provas
--    Provas vinculadas a uma faculdade (via curso, mas denormalizado para
--    filtros diretos sem join em queries de segurança).
-- -----------------------------------------------------------------------------

ALTER TABLE provas
    ADD COLUMN faculdade_id INT NOT NULL
        COMMENT 'Denormalizado da faculdade do curso para isolamento rápido'
        AFTER id,
    ADD CONSTRAINT fk_provas_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT,
    ADD INDEX idx_provas_faculdade_id       (faculdade_id),
    ADD INDEX idx_provas_faculdade_ativo    (faculdade_id, ativo);

-- -----------------------------------------------------------------------------
-- 5. TABELA: vinculos_aluno_faculdade
--    Relacionamento explícito aluno ↔ faculdade com metadados de matrícula.
--    Permite auditoria, suspensão e data de vínculo sem alterar `usuarios`.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vinculos_aluno_faculdade (
    id              INT         PRIMARY KEY AUTO_INCREMENT,
    usuario_id      INT         NOT NULL,
    faculdade_id    INT         NOT NULL,
    matricula       VARCHAR(50) NULL    COMMENT 'Código de matrícula interno da faculdade',
    status          ENUM('ativo', 'suspenso', 'desligado') NOT NULL DEFAULT 'ativo',
    data_vinculo    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE  KEY uq_vinculo_usuario_faculdade (usuario_id, faculdade_id),
    UNIQUE  KEY uq_vinculo_matricula         (faculdade_id, matricula),

    CONSTRAINT fk_vinculo_usuario
        FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)    ON DELETE CASCADE,
    CONSTRAINT fk_vinculo_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)  ON DELETE CASCADE,

    INDEX idx_vinculo_faculdade_status (faculdade_id, status),
    INDEX idx_vinculo_usuario_id       (usuario_id)
);

-- -----------------------------------------------------------------------------
-- 6. TABELA: admins_faculdade
--    Controla quais usuários são administradores de cada faculdade e com
--    qual nível de permissão (super_admin global fica fora desta tabela).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admins_faculdade (
    id              INT         PRIMARY KEY AUTO_INCREMENT,
    usuario_id      INT         NOT NULL,
    faculdade_id    INT         NOT NULL,
    papel           ENUM('dono', 'admin', 'instrutor', 'coordenador') NOT NULL DEFAULT 'instrutor',
    ativo           BOOLEAN     NOT NULL DEFAULT TRUE,
    data_criacao    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE  KEY uq_admin_faculdade          (usuario_id, faculdade_id),

    CONSTRAINT fk_af_usuario
        FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)    ON DELETE CASCADE,
    CONSTRAINT fk_af_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id)  ON DELETE CASCADE,

    INDEX idx_af_faculdade_papel  (faculdade_id, papel),
    INDEX idx_af_faculdade_ativo  (faculdade_id, ativo),
    INDEX idx_af_usuario_id       (usuario_id)
);

-- -----------------------------------------------------------------------------
-- 7. TABELA: convites_faculdade
--    Permite convidar alunos/admins via token sem precisar de cadastro prévio.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS convites_faculdade (
    id              INT          PRIMARY KEY AUTO_INCREMENT,
    faculdade_id    INT          NOT NULL,
    email           VARCHAR(255) NOT NULL,
    papel           ENUM('aluno', 'instrutor', 'admin') NOT NULL DEFAULT 'aluno',
    token           VARCHAR(100) NOT NULL COMMENT 'Token UUID para aceite do convite',
    usado           BOOLEAN      NOT NULL DEFAULT FALSE,
    valido_ate      DATETIME     NOT NULL,
    criado_por_id   INT          NULL,
    data_criacao    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE  KEY uq_convite_token            (token),
    INDEX       idx_convite_faculdade_email (faculdade_id, email),
    INDEX       idx_convite_valido_ate      (valido_ate),

    CONSTRAINT fk_convite_faculdade
        FOREIGN KEY (faculdade_id)  REFERENCES faculdades(id)  ON DELETE CASCADE,
    CONSTRAINT fk_convite_criado_por
        FOREIGN KEY (criado_por_id) REFERENCES usuarios(id)    ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 8. VIEW DE SEGURANÇA: alunos_por_faculdade
--    Facilita queries e serve de referência para filtros de acesso.
-- -----------------------------------------------------------------------------

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
FROM usuarios u
JOIN vinculos_aluno_faculdade v ON v.usuario_id = u.id
JOIN faculdades f               ON f.id = v.faculdade_id
WHERE u.role = 'aluno';

-- -----------------------------------------------------------------------------
-- 9. VIEW DE SEGURANÇA: cursos_por_faculdade
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW cursos_por_faculdade AS
SELECT
    c.id            AS curso_id,
    c.nome          AS curso_nome,
    c.pago,
    c.status,
    c.ativo,
    c.faculdade_id,
    f.nome          AS faculdade_nome,
    f.slug          AS faculdade_slug
FROM cursos c
JOIN faculdades f ON f.id = c.faculdade_id;

-- =============================================================================
-- RESUMO DO MODELO MULTI-TENANT
-- =============================================================================
--
-- HIERARQUIA:
--   faculdades  (tenant)
--       │
--       ├── usuarios         (faculdade_id)  → alunos e admins por tenant
--       ├── vinculos_aluno_faculdade         → matrícula + status + auditoria
--       ├── admins_faculdade                 → RBAC por faculdade
--       ├── cursos           (faculdade_id)  → cursos isolados por tenant
--       │       └── aulas → videos, presenca
--       ├── provas           (faculdade_id)  → provas isoladas por tenant
--       │       └── questoes → opcoes_resposta → respostas → notas
--       └── convites_faculdade               → onboarding via e-mail
--
-- REGRA DE ACESSO (aplicar em todo filtro de API):
--   SELECT ... WHERE faculdade_id = :faculdade_id_do_token_jwt
--
-- ÍNDICES CHAVE PARA PERFORMANCE:
--   usuarios(faculdade_id, role)       → listagem de alunos/admins
--   cursos(faculdade_id, ativo)        → catálogo de cursos do tenant
--   provas(faculdade_id, ativo)        → provas disponíveis
--   vinculos_aluno_faculdade(faculdade_id, status) → painel de alunos
-- =============================================================================
