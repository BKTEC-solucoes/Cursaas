-- =============================================================================
-- Migration: Adiciona tabela solicitacoes_cadastro
-- Fluxo de aprovação de novos alunos por super admin.
--
-- Executar:
--   mysql -u <user> -p cursaas < database/migration_add_solicitacoes_cadastro.sql
-- =============================================================================

USE cursaas;

-- Cria a tabela apenas se ainda não existir (idempotente)
CREATE TABLE IF NOT EXISTS solicitacoes_cadastro (
    id               INT          NOT NULL AUTO_INCREMENT,

    -- Dados informados pelo candidato no auto-cadastro
    nome             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    telefone         VARCHAR(20)  NULL,
    cpf_rg           VARCHAR(30)  NULL,
    mensagem         TEXT         NULL     COMMENT 'Mensagem opcional do candidato',

    -- Tenant: faculdade onde o candidato quer ingressar
    faculdade_id     INT          NOT NULL,

    -- Ciclo de vida
    --   pendente  → aguardando revisão do super admin
    --   aprovada  → aluno criado em usuarios + vinculos_aluno_faculdade
    --   recusada  → rejeitado, motivo registrado em motivo_recusa
    status           ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
    motivo_recusa    TEXT         NULL     COMMENT 'Preenchido pelo admin ao recusar',

    -- Referência ao usuário criado após aprovação
    usuario_id       INT          NULL     COMMENT 'Preenchido na aprovação',

    -- Auditoria
    criado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_em      DATETIME     NULL,
    revisado_por_id  INT          NULL     COMMENT 'Admin (super_admin) que aprovou/recusou',

    PRIMARY KEY (id),

    -- Garante que um email não tenha duas solicitações ativas na mesma faculdade
    UNIQUE KEY uq_solicitacao_email_faculdade (email, faculdade_id),

    INDEX idx_solic_status       (status),
    INDEX idx_solic_faculdade    (faculdade_id),
    INDEX idx_solic_email        (email),
    INDEX idx_solic_criado_em    (criado_em),

    CONSTRAINT fk_solic_faculdade
        FOREIGN KEY (faculdade_id)    REFERENCES faculdades(id) ON DELETE RESTRICT,
    CONSTRAINT fk_solic_usuario
        FOREIGN KEY (usuario_id)      REFERENCES usuarios(id)   ON DELETE SET NULL,
    CONSTRAINT fk_solic_revisado_por
        FOREIGN KEY (revisado_por_id) REFERENCES usuarios(id)   ON DELETE SET NULL
);

-- =============================================================================
-- Relacionamento entre as tabelas do fluxo de aprovação
-- =============================================================================
--
--  [solicitacoes_cadastro]          [usuarios]              [vinculos_aluno_faculdade]
--   id (PK)                          id (PK)                  id (PK)
--   nome                             nome                     usuario_id ──────────────▶ usuarios.id
--   email              aprovação     email                    faculdade_id ───────────▶ faculdades.id
--   cpf_rg  ─────────────────────▶  senha_hash               matricula
--   telefone            (sistema)    numero_matricula         status
--   faculdade_id ───────────────────▶ faculdade_id            data_vinculo
--   status = 'aprovada'              role = 'aluno'
--   usuario_id ─────────────────────▶ id
--   revisado_por_id ────────────────▶ usuarios.id (admin)
--
-- =============================================================================
-- Fluxo de estados da solicitação
-- =============================================================================
--
--  POST /cadastro              PATCH /aprovar              PATCH /recusar
--       │                           │                           │
--       ▼                           ▼                           ▼
--   [pendente] ──── super admin ──▶ [aprovada]         [recusada]
--                                       │
--                             cria usuarios + vinculos
--                             gera matrícula + senha temp
--                             envia email ao candidato
--
-- =============================================================================
