-- Migracao para cadastro de instituicoes com usuario admin vinculado
-- Execute este arquivo no MySQL

USE cursaas;

CREATE TABLE IF NOT EXISTS instituicoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_instituicao VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    contato VARCHAR(255) NOT NULL,
    endereco VARCHAR(500) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    aprovada BOOLEAN DEFAULT TRUE,
    motivo_rejeicao VARCHAR(500) NULL,
    observacoes TEXT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cnpj (cnpj),
    INDEX idx_ativo (ativo),
    INDEX idx_aprovada (aprovada)
);

ALTER TABLE usuarios
ADD COLUMN instituicao_id INT NULL,
ADD INDEX idx_instituicao_id (instituicao_id);

ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_instituicao_id
FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE SET NULL;
