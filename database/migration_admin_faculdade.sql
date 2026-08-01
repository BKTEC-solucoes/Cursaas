-- =========================================================
-- Migration: terceiro cargo administrativo — admin_faculdade
-- Data: 2026-08-01
--
-- Antes existiam dois sub-papéis de admin (super_admin e instrutor) e um
-- terceiro estado implícito, o admin legado (admin_role NULL). Faltava o cargo
-- do meio: quem administra UMA instituição — cursos, aulas, provas, notas,
-- presença, alunos, tema e os administradores dela — sem alcançar a plataforma.
--
-- Esta migration só amplia os ENUMs; nenhuma linha muda de valor. Admins
-- existentes continuam como estão (inclusive os legados, que o backend trata
-- como admin da faculdade).
--
-- APLICAR À MÃO — não há ferramenta de migração no projeto:
--   docker exec -i cursaas-db-1 mysql -u root -p cursaas < database/migration_admin_faculdade.sql
-- =========================================================
USE cursaas;

ALTER TABLE usuarios
  MODIFY COLUMN admin_role ENUM('super_admin', 'admin_faculdade', 'instrutor')
    NULL DEFAULT NULL;

ALTER TABLE convites_admin
  MODIFY COLUMN admin_role ENUM('super_admin', 'admin_faculdade', 'instrutor')
    NOT NULL DEFAULT 'instrutor';

-- Opcional — promover os admins legados (admin_role NULL) ao novo cargo, para
-- que o painel mostre o rótulo correto em vez de "Legado". Só rode se todos os
-- legados da base forem, de fato, administradores de uma única faculdade:
--
-- UPDATE usuarios
--    SET admin_role = 'admin_faculdade'
--  WHERE role = 'admin' AND admin_role IS NULL AND faculdade_id IS NOT NULL;
