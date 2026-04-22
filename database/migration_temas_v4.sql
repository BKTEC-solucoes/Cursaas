-- =============================================================================
-- Migration: tema v4 — campos avançados de identidade visual
-- Tabela: faculdade_temas
-- =============================================================================

ALTER TABLE faculdade_temas
    -- Raio de borda global (ex: 4px, 8px, 12px)
    ADD COLUMN IF NOT EXISTS border_radius     VARCHAR(10)  NOT NULL DEFAULT '8px'
        COMMENT 'Raio de borda global dos componentes UI',

    -- Espaçamento entre elementos (compact=0.75rem, comfortable=1rem, spacious=1.5rem)
    ADD COLUMN IF NOT EXISTS spacing           ENUM('compact','comfortable','spacious')
                                               NOT NULL DEFAULT 'comfortable'
        COMMENT 'Densidade de espaçamento da interface',

    -- Estilo dos botões
    ADD COLUMN IF NOT EXISTS button_style      ENUM('rounded','square','pill')
                                               NOT NULL DEFAULT 'rounded'
        COMMENT 'Forma dos botões de ação',

    -- Nível de sombra dos cards/elementos
    ADD COLUMN IF NOT EXISTS shadow_level      ENUM('none','soft','strong')
                                               NOT NULL DEFAULT 'soft'
        COMMENT 'Intensidade de sombras nos componentes',

    -- Layout estrutural da plataforma
    ADD COLUMN IF NOT EXISTS layout_type       ENUM('topbar','sidebar')
                                               NOT NULL DEFAULT 'topbar'
        COMMENT 'Tipo de navegação principal da plataforma',

    -- Habilitar gradiente na cor primária (header/botões)
    ADD COLUMN IF NOT EXISTS gradient_enabled  TINYINT(1)   NOT NULL DEFAULT 0
        COMMENT 'Aplica gradiente na cor primária quando ativo';

-- Índice para consultas por layout (útil para listagens multi-tenant)
ALTER TABLE faculdade_temas
    ADD INDEX IF NOT EXISTS idx_faculdade_temas_layout (faculdade_id, layout_type);
