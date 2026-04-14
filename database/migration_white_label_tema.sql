-- ===========================================================================
-- White-Label: Colunas de tema por faculdade (tenant)
-- Cada faculdade pode ter primary_color, secondary_color, font_family,
-- background_color. logo_url já existe na tabela.
-- ===========================================================================

ALTER TABLE faculdades
    ADD COLUMN primary_color    VARCHAR(20)  NULL  COMMENT 'Hex ou CSS color — ex: #1a6b3c'
        AFTER logo_url,
    ADD COLUMN secondary_color  VARCHAR(20)  NULL  COMMENT 'Hex ou CSS color — ex: #0f4b2a'
        AFTER primary_color,
    ADD COLUMN background_color VARCHAR(20)  NULL  COMMENT 'Hex ou CSS color — ex: #f0fdf4'
        AFTER secondary_color,
    ADD COLUMN font_family      VARCHAR(100) NULL  COMMENT 'Font stack CSS — ex: "Inter, sans-serif"'
        AFTER background_color;
