-- Migration: layout expansion (content_width + sidebar_collapsible)
-- Adiciona os campos de expansão de layout ao tema das faculdades.
-- Execute APÓS migration_login_customization.sql

ALTER TABLE faculdade_temas
  ADD COLUMN content_width ENUM('full', 'boxed') NOT NULL DEFAULT 'boxed'
    COMMENT 'Largura do conteúdo principal: full (tela toda) ou boxed (max 1400px)';

ALTER TABLE faculdade_temas
  ADD COLUMN sidebar_collapsible TINYINT(1) NOT NULL DEFAULT 1
    COMMENT 'Se 1, o usuário pode recolher a sidebar para modo rail (ícones)';
