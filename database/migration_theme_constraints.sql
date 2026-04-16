-- Migration: restrições de integridade de tema
-- Adiciona CHECK constraints ao banco para reforçar as regras de validação
-- mesmo quando dados chegam fora do caminho Pydantic (seeds, migrations manuais).
-- Execute APÓS migration_microinteractions.sql

-- Cor primária deve ser hex válida
ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_primary_color_hex
    CHECK (primary_color REGEXP '^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$');

ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_secondary_color_hex
    CHECK (secondary_color REGEXP '^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$');

ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_background_color_hex
    CHECK (background_color REGEXP '^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$');

-- border_radius: apenas valores CSS de comprimento (px, rem, em, %)
-- Nota: a validação do limite 32px fica no Pydantic (CHECK não suporta parse numérico facilmente)
ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_border_radius_format
    CHECK (border_radius REGEXP '^[0-9]+(\\.[0-9]+)?(px|rem|em|%)$');

-- login_layout: somente os 3 layouts conhecidos
ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_login_layout_values
    CHECK (login_layout IN ('centered', 'split-left', 'split-right'));

-- login_background_type: sem valores arbitrários
ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_login_bg_type_values
    CHECK (login_background_type IN ('gradient', 'color', 'image'));

-- anim_intensity e transition_type devem ser consistentes:
-- se anim_intensity = 'none', transition_type deve ser 'instant'
ALTER TABLE faculdade_temas
  ADD CONSTRAINT chk_anim_transition_consistency
    CHECK (
      anim_intensity != 'none' OR transition_type = 'instant'
    );
