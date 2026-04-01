-- Cursaas - Portal EAD
-- Schema MySQL para Banco de Dados

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS cursaas;
USE cursaas;

-- Tabela de Usuários (Admin e Alunos)
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    role ENUM('admin', 'aluno') NOT NULL DEFAULT 'aluno',
    admin_role ENUM('super_admin', 'instrutor', 'financeiro', 'suporte') NULL DEFAULT NULL,
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
    ativo BOOLEAN DEFAULT FALSE,
    aprovada BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj),
    INDEX idx_ativo (ativo),
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
    percentual_presenca_minima INT DEFAULT 75,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ativo (ativo)
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
