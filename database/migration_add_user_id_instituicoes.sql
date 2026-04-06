-- Migracao de compatibilidade para separar os dados de instituicao e usuario
-- Data: 2026-04-01

USE cursaas;

ALTER TABLE usuarios
ADD COLUMN instituicao_id INT NULL;

ALTER TABLE usuarios
ADD INDEX idx_instituicao_id (instituicao_id);

ALTER TABLE instituicoes
ADD COLUMN contato VARCHAR(255) NULL;

UPDATE instituicoes
SET contato = contato_responsavel
WHERE (contato IS NULL OR contato = '')
  AND contato_responsavel IS NOT NULL;

ALTER TABLE instituicoes
MODIFY COLUMN email VARCHAR(255) NULL,
MODIFY COLUMN nome_responsavel VARCHAR(255) NULL,
MODIFY COLUMN contato_responsavel VARCHAR(255) NULL,
MODIFY COLUMN senha VARCHAR(255) NULL;

UPDATE usuarios u
JOIN instituicoes i ON i.user_id = u.id
SET u.instituicao_id = i.id
WHERE u.instituicao_id IS NULL;

ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_instituicao_id
FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE SET NULL;
