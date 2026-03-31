-- Migração para adicionar tabela de instituições
-- Execute este arquivo SQL no seu banco de dados MySQL

USE cursaas;

-- Criar tabela de instituições se não existir
CREATE TABLE IF NOT EXISTS instituicoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_instituicao VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome_responsavel VARCHAR(255) NOT NULL,
    contato_responsavel VARCHAR(255) NOT NULL,
    endereco VARCHAR(500) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT FALSE,
    aprovada BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj),
    INDEX idx_email (email),
    INDEX idx_ativo (ativo),
    INDEX idx_aprovada (aprovada)
);

-- Inserir índice composto se necessário (para buscas otimizadas)
ALTER TABLE instituicoes ADD INDEX idx_email_ativo (email, ativo);
