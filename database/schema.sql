-- Cursaas - Portal EAD
-- Schema MySQL — Multi-Tenant por Faculdade
-- Atualizado: 2026-04-08

CREATE DATABASE IF NOT EXISTS cursaas;
USE cursaas;

-- =============================================================================
-- TENANT ROOT: faculdades
-- Cada faculdade é um tenant isolado. Todos os recursos herdam faculdade_id.
-- =============================================================================

CREATE TABLE faculdades (
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
    INDEX idx_faculdades_aprovada (aprovada),
    INDEX idx_faculdades_plano    (plano)
);

-- =============================================================================
-- Tabela de Instituições (legado — mantida para compatibilidade)
-- =============================================================================

CREATE TABLE instituicoes (
    id               INT          NOT NULL AUTO_INCREMENT,
    nome_instituicao VARCHAR(255) NOT NULL,
    cnpj             VARCHAR(18)  UNIQUE NOT NULL,
    contato          VARCHAR(255) NOT NULL,
    endereco         VARCHAR(500) NOT NULL,
    ativa            BOOLEAN      NOT NULL DEFAULT FALSE,
    aprovada         BOOLEAN      NOT NULL DEFAULT FALSE,
    data_criacao     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_inst_cnpj     (cnpj),
    INDEX idx_inst_ativa    (ativa),
    INDEX idx_inst_aprovada (aprovada)
);

-- =============================================================================
-- Tabela de Usuários (Admin e Alunos)
-- faculdade_id: NULL apenas para super_admin global
-- =============================================================================

CREATE TABLE usuarios (
    id               INT            NOT NULL AUTO_INCREMENT,
    nome             VARCHAR(255)   NOT NULL,
    email            VARCHAR(255)   UNIQUE NOT NULL,
    senha            VARCHAR(255)   NOT NULL,
    role             ENUM('admin', 'aluno') NOT NULL DEFAULT 'aluno',
    admin_role       ENUM('super_admin', 'instrutor') NULL DEFAULT NULL,
    foto_perfil      LONGTEXT       NULL,
    instituicao_id   INT            NULL,
    faculdade_id     INT            NULL     COMMENT 'Tenant do usuário. NULL = super_admin global',
    -- Dados pessoais
    data_nascimento  DATE           NULL,
    sexo             VARCHAR(20)    NULL,
    cpf_rg           VARCHAR(30)    NULL,
    -- Endereço e contato
    endereco         VARCHAR(500)   NULL,
    cep              VARCHAR(10)    NULL,
    telefone         VARCHAR(20)    NULL,
    -- Responsável
    nome_responsavel VARCHAR(255)   NULL,
    -- Dados escolares
    numero_matricula VARCHAR(50)    NULL,
    turma            VARCHAR(100)   NULL,
    historico_escolar TEXT          NULL,
    ativo            BOOLEAN        NOT NULL DEFAULT TRUE,
    data_criacao     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email    (email),
    UNIQUE KEY uq_usuarios_cpf_rg   (cpf_rg),
    UNIQUE KEY uq_usuarios_matricula (numero_matricula),
    INDEX idx_usuarios_role               (role),
    INDEX idx_usuarios_admin_role         (admin_role),
    INDEX idx_usuarios_instituicao_id     (instituicao_id),
    -- Índices de tenant (queries mais frequentes)
    INDEX idx_usuarios_faculdade_id       (faculdade_id),
    INDEX idx_usuarios_faculdade_role     (faculdade_id, role),
    INDEX idx_usuarios_faculdade_ativo    (faculdade_id, ativo),

    CONSTRAINT fk_usuarios_instituicao
        FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE SET NULL,
    CONSTRAINT fk_usuarios_faculdade
        FOREIGN KEY (faculdade_id)   REFERENCES faculdades(id)   ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =============================================================================
-- Vínculo explícito Aluno ↔ Faculdade
-- Guarda matrícula, status e histórico separadamente de usuarios
-- =============================================================================

CREATE TABLE vinculos_aluno_faculdade (
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

-- =============================================================================
-- Convites de Admin
-- =============================================================================

CREATE TABLE convites_admin (
    id               INT          NOT NULL AUTO_INCREMENT,
    token            VARCHAR(128) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    admin_role       ENUM('super_admin', 'instrutor') NOT NULL DEFAULT 'instrutor',
    convidado_por_id INT          NULL,
    usado            BOOLEAN      NOT NULL DEFAULT FALSE,
    data_criacao     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao   DATETIME     NOT NULL,
    data_uso         DATETIME     NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_convite_token  (token),
    INDEX idx_convite_email      (email),
    INDEX idx_convite_usado      (usado),

    CONSTRAINT fk_convite_convidado_por
        FOREIGN KEY (convidado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================================================
-- Cursos — pertence a uma faculdade
-- =============================================================================

CREATE TABLE cursos (
    id                         INT             NOT NULL AUTO_INCREMENT,
    faculdade_id               INT             NULL     COMMENT 'Tenant dono do curso',
    nome                       VARCHAR(255)    NOT NULL,
    descricao                  TEXT,
    pago                       BOOLEAN         NOT NULL DEFAULT FALSE,
    valor                      DECIMAL(10, 2)  NULL,
    status                     ENUM('pendente', 'aprovado', 'recusado') NOT NULL DEFAULT 'aprovado',
    percentual_presenca_minima INT             NOT NULL DEFAULT 75,
    ativo                      BOOLEAN         NOT NULL DEFAULT TRUE,
    criado_por_id              INT             NULL,
    data_criacao               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_cursos_faculdade_id      (faculdade_id),
    INDEX idx_cursos_faculdade_ativo   (faculdade_id, ativo),
    INDEX idx_cursos_faculdade_status  (faculdade_id, status),
    INDEX idx_cursos_ativo             (ativo),
    INDEX idx_cursos_status            (status),
    INDEX idx_cursos_pago              (pago),
    INDEX idx_cursos_criado_por_id     (criado_por_id),

    CONSTRAINT fk_cursos_faculdade
        FOREIGN KEY (faculdade_id)  REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cursos_criado_por
        FOREIGN KEY (criado_por_id) REFERENCES usuarios(id)   ON DELETE SET NULL
);

-- =============================================================================
-- Vínculo Admin-Curso
-- =============================================================================

CREATE TABLE admin_cursos (
    id           INT       NOT NULL AUTO_INCREMENT,
    admin_id     INT       NOT NULL,
    curso_id     INT       NOT NULL,
    data_vinculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_curso  (admin_id, curso_id),
    INDEX idx_ac_admin_id      (admin_id),
    INDEX idx_ac_curso_id      (curso_id),

    CONSTRAINT fk_ac_admin FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ac_curso FOREIGN KEY (curso_id) REFERENCES cursos(id)   ON DELETE CASCADE
);

-- =============================================================================
-- Inscrições em Cursos
-- =============================================================================

CREATE TABLE inscricoes_cursos (
    id             INT       NOT NULL AUTO_INCREMENT,
    usuario_id     INT       NOT NULL,
    curso_id       INT       NOT NULL,
    data_inscricao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_inscricao         (usuario_id, curso_id),
    INDEX idx_ic_usuario_id        (usuario_id),
    INDEX idx_ic_curso_id          (curso_id),

    CONSTRAINT fk_ic_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ic_curso   FOREIGN KEY (curso_id)   REFERENCES cursos(id)   ON DELETE CASCADE
);

-- =============================================================================
-- Solicitações de Acesso a Cursos Pagos
-- =============================================================================

CREATE TABLE course_requests (
    id         INT  NOT NULL AUTO_INCREMENT,
    usuario_id INT  NOT NULL,
    curso_id   INT  NOT NULL,
    status     ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_course_request    (usuario_id, curso_id),
    INDEX idx_cr_usuario_id        (usuario_id),
    INDEX idx_cr_curso_id          (curso_id),
    INDEX idx_cr_status            (status),

    CONSTRAINT fk_cr_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_cr_curso   FOREIGN KEY (curso_id)   REFERENCES cursos(id)   ON DELETE CASCADE
);

-- =============================================================================
-- Aulas — pertence a um curso (herda faculdade via curso)
-- =============================================================================

CREATE TABLE aulas (
    id               INT          NOT NULL AUTO_INCREMENT,
    curso_id         INT          NOT NULL,
    titulo           VARCHAR(255) NOT NULL,
    descricao        TEXT,
    data_aula        DATETIME     NOT NULL,
    duracao_minutos  INT          NULL,
    ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
    data_criacao     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_aulas_curso_id         (curso_id),
    INDEX idx_aulas_data_aula        (data_aula),
    -- Índice composto: lista de aulas de um curso ativas
    INDEX idx_aulas_curso_ativo      (curso_id, ativo),

    CONSTRAINT fk_aulas_curso FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
);

-- =============================================================================
-- Vídeos (Uploads das Aulas)
-- =============================================================================

CREATE TABLE videos (
    id               INT          NOT NULL AUTO_INCREMENT,
    aula_id          INT          NOT NULL,
    arquivo_nome     VARCHAR(255) NOT NULL,
    caminho_arquivo  VARCHAR(500) NOT NULL,
    tamanho_bytes    BIGINT       NULL,
    duracao_segundos INT          NULL,
    formato          VARCHAR(50)  NULL,
    status           ENUM('processando', 'disponivel', 'erro') NOT NULL DEFAULT 'disponivel',
    data_upload      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_aula_video    (aula_id),
    INDEX idx_videos_aula_id   (aula_id),
    INDEX idx_videos_status    (status),

    CONSTRAINT fk_videos_aula FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE CASCADE
);

-- =============================================================================
-- Presença
-- =============================================================================

CREATE TABLE presenca (
    id                         INT      NOT NULL AUTO_INCREMENT,
    usuario_id                 INT      NOT NULL,
    aula_id                    INT      NOT NULL,
    percentual_assistido       INT      NOT NULL DEFAULT 0,
    registrada_automaticamente BOOLEAN  NOT NULL DEFAULT FALSE,
    tempo_total_segundos       INT      NOT NULL DEFAULT 0,
    data_acesso                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_conclusao             DATETIME  NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_presenca              (usuario_id, aula_id),
    INDEX idx_presenca_usuario_id      (usuario_id),
    INDEX idx_presenca_aula_id         (aula_id),
    INDEX idx_presenca_automatica      (registrada_automaticamente),
    -- Índice composto: relatório de presença por aula
    INDEX idx_presenca_aula_usuario    (aula_id, usuario_id),

    CONSTRAINT fk_presenca_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_presenca_aula    FOREIGN KEY (aula_id)    REFERENCES aulas(id)    ON DELETE CASCADE
);

-- =============================================================================
-- Provas — faculdade_id denormalizado para isolamento direto sem JOIN
-- =============================================================================

CREATE TABLE provas (
    id                   INT          NOT NULL AUTO_INCREMENT,
    faculdade_id         INT          NULL     COMMENT 'Denormalizado de cursos.faculdade_id para filtro direto',
    curso_id             INT          NOT NULL,
    titulo               VARCHAR(255) NOT NULL,
    descricao            TEXT,
    data_inicio          DATETIME     NOT NULL,
    data_fim             DATETIME     NOT NULL,
    tempo_limite_minutos INT          NULL,
    tentativas_permitidas INT         NOT NULL DEFAULT 1,
    ativo                BOOLEAN      NOT NULL DEFAULT TRUE,
    data_criacao         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_provas_faculdade_id    (faculdade_id),
    INDEX idx_provas_faculdade_ativo (faculdade_id, ativo),
    INDEX idx_provas_curso_id        (curso_id),
    INDEX idx_provas_data_inicio     (data_inicio),
    INDEX idx_provas_ativo           (ativo),

    CONSTRAINT fk_provas_faculdade
        FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_provas_curso
        FOREIGN KEY (curso_id)     REFERENCES cursos(id)     ON DELETE CASCADE
);

-- =============================================================================
-- Questões
-- =============================================================================

CREATE TABLE questoes (
    id           INT            NOT NULL AUTO_INCREMENT,
    prova_id     INT            NOT NULL,
    tipo         ENUM('multipla_escolha', 'dissertativa') NOT NULL DEFAULT 'multipla_escolha',
    enunciado    TEXT           NOT NULL,
    ordem        INT            NULL,
    pontos       DECIMAL(5, 2)  NOT NULL DEFAULT 1.00,
    data_criacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_questoes_prova_id (prova_id),
    INDEX idx_questoes_ordem    (prova_id, ordem),

    CONSTRAINT fk_questoes_prova FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE
);

-- =============================================================================
-- Opções de Resposta
-- =============================================================================

CREATE TABLE opcoes_resposta (
    id           INT       NOT NULL AUTO_INCREMENT,
    questao_id   INT       NOT NULL,
    texto        TEXT      NOT NULL,
    correta      BOOLEAN   NOT NULL DEFAULT FALSE,
    ordem        INT       NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_opcoes_questao_id (questao_id),
    INDEX idx_opcoes_ordem      (questao_id, ordem),

    CONSTRAINT fk_opcoes_questao FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
);

-- =============================================================================
-- Respostas (Submissões dos Alunos)
-- =============================================================================

CREATE TABLE respostas (
    id             INT       NOT NULL AUTO_INCREMENT,
    usuario_id     INT       NOT NULL,
    prova_id       INT       NOT NULL,
    questao_id     INT       NOT NULL,
    texto_resposta TEXT      NULL,
    opcao_id       INT       NULL,
    correta        BOOLEAN   NULL,
    data_resposta  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_respostas_usuario_id (usuario_id),
    INDEX idx_respostas_prova_id   (prova_id),
    INDEX idx_respostas_questao_id (questao_id),
    -- Índice composto: buscar todas as respostas de um aluno em uma prova
    INDEX idx_respostas_usuario_prova (usuario_id, prova_id),

    CONSTRAINT fk_resp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)         ON DELETE CASCADE,
    CONSTRAINT fk_resp_prova   FOREIGN KEY (prova_id)   REFERENCES provas(id)            ON DELETE CASCADE,
    CONSTRAINT fk_resp_questao FOREIGN KEY (questao_id) REFERENCES questoes(id)          ON DELETE CASCADE,
    CONSTRAINT fk_resp_opcao   FOREIGN KEY (opcao_id)   REFERENCES opcoes_resposta(id)   ON DELETE SET NULL
);

-- =============================================================================
-- Notas (resultado por prova)
-- =============================================================================

CREATE TABLE notas (
    id               INT            NOT NULL AUTO_INCREMENT,
    usuario_id       INT            NOT NULL,
    prova_id         INT            NOT NULL,
    nota_final       DECIMAL(5, 2)  NULL,
    tentativa        INT            NOT NULL DEFAULT 1,
    data_submissao   DATETIME       NULL,
    data_correcao    DATETIME       NULL,
    observacoes      TEXT           NULL,
    data_criacao     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_notas_usuario_id  (usuario_id),
    INDEX idx_notas_prova_id    (prova_id),
    INDEX idx_notas_nota_final  (nota_final),
    -- Índice composto: boletim do aluno
    INDEX idx_notas_usuario_prova (usuario_id, prova_id),

    CONSTRAINT fk_notas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_notas_prova   FOREIGN KEY (prova_id)   REFERENCES provas(id)   ON DELETE CASCADE
);

-- =============================================================================
-- Notas de Cursos (média final por curso)
-- =============================================================================

CREATE TABLE notas_cursos (
    id               INT           NOT NULL AUTO_INCREMENT,
    usuario_id       INT           NOT NULL,
    curso_id         INT           NOT NULL,
    media_final      DECIMAL(5, 2) NULL,
    aprovado         BOOLEAN       NULL,
    data_atualizacao TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_nota_curso          (usuario_id, curso_id),
    INDEX idx_nc_usuario_id          (usuario_id),
    INDEX idx_nc_curso_id            (curso_id),
    INDEX idx_nc_aprovado            (aprovado),

    CONSTRAINT fk_nc_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_nc_curso   FOREIGN KEY (curso_id)   REFERENCES cursos(id)   ON DELETE CASCADE
);

-- =============================================================================
-- VIEW: alunos por faculdade (consulta de segurança)
-- =============================================================================

CREATE OR REPLACE VIEW alunos_por_faculdade AS
SELECT
    u.id            AS usuario_id,
    u.nome,
    u.email,
    u.numero_matricula,
    u.ativo         AS usuario_ativo,
    v.faculdade_id,
    f.nome          AS faculdade_nome,
    f.slug          AS faculdade_slug,
    v.matricula     AS matricula_vinculo,
    v.status        AS vinculo_status,
    v.data_vinculo
FROM  usuarios u
JOIN  vinculos_aluno_faculdade v ON v.usuario_id   = u.id
JOIN  faculdades f               ON f.id           = v.faculdade_id
WHERE u.role = 'aluno';

-- =============================================================================
-- Solicitações de Cadastro
-- Fila de aprovação: candidato se auto-cadastra aqui.
-- O aluno real (usuarios + vinculos_aluno_faculdade) só é criado após aprovação.
-- =============================================================================

CREATE TABLE solicitacoes_cadastro (
    id               INT          NOT NULL AUTO_INCREMENT,

    -- Dados informados pelo candidato
    nome             VARCHAR(255) NOT NULL,
    email            VARCHAR(255) NOT NULL,
    telefone         VARCHAR(20)  NULL,
    cpf_rg           VARCHAR(30)  NULL,
    mensagem         TEXT         NULL     COMMENT 'Mensagem opcional do candidato',

    -- Faculdade desejada (tenant)
    faculdade_id     INT          NOT NULL,

    -- Ciclo de vida da solicitação
    status           ENUM('pendente', 'aprovada', 'recusada') NOT NULL DEFAULT 'pendente',
    motivo_recusa    TEXT         NULL     COMMENT 'Preenchido pelo admin ao recusar',

    -- Referência ao aluno criado após aprovação
    usuario_id       INT          NULL     COMMENT 'Preenchido após aprovação — aponta para usuarios.id',

    -- Auditoria
    criado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_em      DATETIME     NULL,
    revisado_por_id  INT          NULL     COMMENT 'Admin que aprovou/recusou',

    PRIMARY KEY (id),

    -- Um email só pode ter uma solicitação pendente por faculdade
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
-- VIEW: cursos por faculdade
-- =============================================================================

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
FROM  cursos c
JOIN  faculdades f ON f.id = c.faculdade_id;


-- Tabela de Usuários (Admin e Alunos)
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    role ENUM('admin', 'aluno') NOT NULL DEFAULT 'aluno',
    admin_role ENUM('super_admin', 'instrutor') NULL DEFAULT NULL,
    foto_perfil LONGTEXT NULL,
    instituicao_id INT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_admin_role (admin_role),
    INDEX idx_instituicao_id (instituicao_id)
);

-- Tabela de Instituições (Cadastro de Instituições)
CREATE TABLE instituicoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_instituicao VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    contato VARCHAR(255) NOT NULL,
    endereco VARCHAR(500) NOT NULL,
    ativa BOOLEAN DEFAULT FALSE,
    aprovada BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj),
    INDEX idx_ativa (ativa),
    INDEX idx_aprovada (aprovada)
);

ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_instituicao_id
FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE SET NULL;

-- Tabela de Cursos
CREATE TABLE cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    pago BOOLEAN DEFAULT FALSE NOT NULL,
    valor DECIMAL(10, 2) NULL,
    status ENUM('pendente', 'aprovado', 'recusado') DEFAULT 'aprovado' NOT NULL,
    percentual_presenca_minima INT DEFAULT 75,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_por_id INT NULL,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_ativo (ativo),
    INDEX idx_criado_por_id (criado_por_id),
    INDEX idx_status (status),
    INDEX idx_pago (pago)
);

-- Tabela de Vínculo Admin-Curso (controle de permissões por curso)
CREATE TABLE admin_cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    curso_id INT NOT NULL,
    data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_admin_curso (admin_id, curso_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_curso_id (curso_id)
);

-- Tabela de Inscrições em Cursos
CREATE TABLE inscricoes_cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    curso_id INT NOT NULL,
    data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inscricao (usuario_id, curso_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_curso_id (curso_id)
);

-- Tabela de Aulas
CREATE TABLE aulas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    curso_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_aula DATETIME NOT NULL,
    duracao_minutos INT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    INDEX idx_curso_id (curso_id),
    INDEX idx_data_aula (data_aula)
);

-- Tabela de Vídeos (Uploads das Aulas)
CREATE TABLE videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    aula_id INT NOT NULL,
    arquivo_nome VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_bytes BIGINT,
    duracao_segundos INT,
    formato VARCHAR(50),
    status ENUM('processando', 'disponivel', 'erro') DEFAULT 'disponivel',
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_aula_video (aula_id),
    INDEX idx_aula_id (aula_id),
    INDEX idx_status (status)
);

-- Tabela de Presença
CREATE TABLE presenca (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    aula_id INT NOT NULL,
    percentual_assistido INT DEFAULT 0,
    registrada_automaticamente BOOLEAN DEFAULT FALSE,
    tempo_total_segundos INT DEFAULT 0,
    data_acesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_conclusao DATETIME,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (aula_id) REFERENCES aulas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_presenca (usuario_id, aula_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_aula_id (aula_id),
    INDEX idx_registrada_automaticamente (registrada_automaticamente)
);

-- Tabela de Provas
CREATE TABLE provas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    curso_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    tempo_limite_minutos INT,
    tentativas_permitidas INT DEFAULT 1,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    INDEX idx_curso_id (curso_id),
    INDEX idx_data_inicio (data_inicio),
    INDEX idx_ativo (ativo)
);

-- Tabela de Questões
CREATE TABLE questoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prova_id INT NOT NULL,
    tipo ENUM('multipla_escolha', 'dissertativa') DEFAULT 'multipla_escolha',
    enunciado TEXT NOT NULL,
    ordem INT,
    pontos DECIMAL(5, 2) DEFAULT 1.00,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
    INDEX idx_prova_id (prova_id),
    INDEX idx_ordem (ordem)
);

-- Tabela de Opções de Resposta (para múltipla escolha)
CREATE TABLE opcoes_resposta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    questao_id INT NOT NULL,
    texto TEXT NOT NULL,
    correta BOOLEAN DEFAULT FALSE,
    ordem INT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE,
    INDEX idx_questao_id (questao_id),
    INDEX idx_ordem (ordem)
);

-- Tabela de Respostas (Submissões dos Alunos)
CREATE TABLE respostas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    prova_id INT NOT NULL,
    questao_id INT NOT NULL,
    texto_resposta TEXT,
    opcao_id INT,
    correta BOOLEAN,
    data_resposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
    FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE,
    FOREIGN KEY (opcao_id) REFERENCES opcoes_resposta(id) ON DELETE SET NULL,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_prova_id (prova_id),
    INDEX idx_questao_id (questao_id)
);

-- Tabela de Notas
CREATE TABLE notas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    prova_id INT NOT NULL,
    nota_final DECIMAL(5, 2),
    tentativa INT DEFAULT 1,
    data_submissao DATETIME,
    data_correcao DATETIME,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_prova_id (prova_id),
    INDEX idx_nota_final (nota_final)
);

-- Tabela de Histórico de Notas de Cursos
CREATE TABLE notas_cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    curso_id INT NOT NULL,
    media_final DECIMAL(5, 2),
    aprovado BOOLEAN,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_nota_curso (usuario_id, curso_id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_curso_id (curso_id),
    INDEX idx_aprovado (aprovado)
);
