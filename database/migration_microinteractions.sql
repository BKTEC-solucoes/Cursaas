-- Migration: microinterações (anim_intensity + transition_type)
-- Adiciona os campos de controle de animação ao tema das faculdades.
-- Execute APÓS migration_layout_expansion.sql

ALTER TABLE faculdade_temas
  ADD COLUMN anim_intensity ENUM('none', 'reduced', 'normal', 'expressive')
    NOT NULL DEFAULT 'normal'
    COMMENT 'Intensidade das microinterações: none | reduced | normal | expressive';

ALTER TABLE faculdade_temas
  ADD COLUMN transition_type ENUM('instant', 'fade', 'slide', 'spring')
    NOT NULL DEFAULT 'fade'
    COMMENT 'Curva de transição: instant (0ms) | fade (ease) | slide (ease-out) | spring (cubic-bezier overshoot)';
