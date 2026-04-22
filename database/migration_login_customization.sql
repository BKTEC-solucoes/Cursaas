-- ===========================================================================
-- Login customization: campos de personalização da tela de login por tenant
-- Aplica-se à tabela faculdade_temas
-- ===========================================================================

ALTER TABLE faculdade_temas
    ADD COLUMN login_layout          VARCHAR(20)  NOT NULL DEFAULT 'centered'
        COMMENT 'Layout da tela de login: centered | split-left | split-right'
        AFTER page_overrides,
    ADD COLUMN login_background_type VARCHAR(20)  NOT NULL DEFAULT 'gradient'
        COMMENT 'Tipo de background do painel de branding: gradient | color | image'
        AFTER login_layout,
    ADD COLUMN login_background_value VARCHAR(500) NULL DEFAULT NULL
        COMMENT 'Valor do background: hex (#rrggbb) para color, URL para image. NULL = usar primary/secondary'
        AFTER login_background_type,
    ADD COLUMN login_message_title   VARCHAR(120) NULL DEFAULT NULL
        COMMENT 'Título exibido no painel de branding (split) ou sobre o card (centered). NULL = nome da faculdade'
        AFTER login_background_value,
    ADD COLUMN login_message_body    VARCHAR(300) NULL DEFAULT NULL
        COMMENT 'Subtítulo/mensagem do painel de branding. NULL = texto padrão da plataforma'
        AFTER login_message_title;
