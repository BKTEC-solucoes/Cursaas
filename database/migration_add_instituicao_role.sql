-- Migration: adiciona o valor 'instituicao' ao ENUM role da tabela usuarios
-- Execute uma vez para atualizar o banco de dados.

ALTER TABLE usuarios
  MODIFY COLUMN role ENUM('admin', 'aluno', 'instituicao') NOT NULL DEFAULT 'aluno';
