-- Migration: vincula o convite de administrador a uma faculdade.
--
-- Sem esta coluna o admin criado por convite nascia sem faculdade_id — o
-- terceiro estado do TenantContext ("sem tenant"): login funciona, mas toda
-- listagem volta vazia e toda escrita responde 403.
--
-- O painel do super admin passa a gravar aqui a instituição que estava sendo
-- gerenciada no momento do envio (cabeçalho X-Faculdade-Id).
--
-- Convites antigos ficam com NULL: o comportamento deles não muda.

ALTER TABLE convites_admin
ADD COLUMN faculdade_id INT NULL AFTER admin_role,
ADD CONSTRAINT fk_convites_admin_faculdade
    FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE CASCADE;

CREATE INDEX idx_convites_admin_faculdade ON convites_admin(faculdade_id);
