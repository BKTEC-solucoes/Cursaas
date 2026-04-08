-- =========================================================
-- Migration: adicionar colunas admin_role e foto_perfil
-- Data: 2026-03-19
-- =========================================================
USE cursaas;

ALTER TABLE usuarios
  ADD COLUMN admin_role ENUM('super_admin', 'instrutor')
    NULL DEFAULT NULL
    AFTER role,
  ADD INDEX idx_admin_role (admin_role);

-- Adicionar coluna foto_perfil se ainda não existir
ALTER TABLE usuarios
  ADD COLUMN foto_perfil VARCHAR(500)
    NULL
    AFTER admin_role;

-- Admins cadastrados antes desta migration ficam com admin_role = NULL.
-- O sistema os trata como Super Admin por retrocompatibilidade.
-- Para migrar manualmente admins legados:
-- UPDATE usuarios SET admin_role = 'super_admin' WHERE role = 'admin' AND admin_role IS NULL;
