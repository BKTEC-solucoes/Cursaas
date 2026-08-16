-- ---------------------------------------------------------------------------
-- 20260804_1000_temas_dark_e_presets
--
-- Duas coisas:
--
-- 1) Semeia / atualiza `tema_presets`. A carga original desses presets vivia em
--    `database/migration_temas_v3.sql`, que o runner NÃO enxerga — num banco
--    novo a tabela nasce vazia via create_all() e a tela de tema abre sem
--    nenhum preset. Aqui a carga é idempotente (UPSERT por nome) e vale tanto
--    para banco novo quanto para os que já têm os 6 originais.
--
-- 2) Corrige o modo escuro do tema padrão. O fundo escuro padrão era #0f172a
--    (ardósia azulada) sob uma marca verde — o dark mode saía com uma dominante
--    azul que brigava com o tema claro. Só as linhas que ainda estão no trio
--    padrão intocado são atualizadas; quem customizou não é tocado.
-- ---------------------------------------------------------------------------

-- ── 1. Chave única em `nome` (permite o UPSERT abaixo) ──────────────────────

-- Remove duplicatas de nome antes de criar a chave: a carga original em
-- database/migration_temas_v3.sql era um INSERT sem guarda, então bancos onde
-- ela rodou duas vezes têm nomes repetidos e o ALTER falharia.
DELETE p FROM tema_presets p
  JOIN tema_presets q ON q.nome = p.nome AND q.id < p.id;

SET @tem_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'tema_presets'
       AND INDEX_NAME   = 'uq_tema_presets_nome'
);
SET @sql := IF(@tem_idx = 0,
    'ALTER TABLE tema_presets ADD UNIQUE KEY uq_tema_presets_nome (nome)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 2. Presets ──────────────────────────────────────────────────────────────
--
-- Regra das cores escuras de cada preset:
--   dark_primary   → stop 400 do matiz (vivo o bastante para passar de 4.5:1
--                    contra o fundo escuro; o stop 600 do modo claro não passa)
--   dark_secondary → stop 500 do mesmo matiz
--   dark_background→ quase-preto TINGIDO com o matiz da marca, nunca a ardósia
--                    azul genérica: as superfícies do app são derivadas dele,
--                    então é ele quem dá a "temperatura" do modo escuro.

INSERT INTO tema_presets
    (nome, preview_color, primary_color, secondary_color, background_color, font_family,
     dark_primary_color, dark_secondary_color, dark_background_color)
VALUES
    -- ── Originais (dark corrigido) ──────────────────────────────────────────
    ('Verde Esmeralda',   '#1a6b3c', '#1a6b3c', '#0f4b2a', '#f0fdf4', 'Inter, system-ui, sans-serif',
     '#34d399', '#10b981', '#0d1a14'),

    ('Azul Oceano',       '#1e40af', '#1e40af', '#1e3a8a', '#eff6ff', 'Inter, system-ui, sans-serif',
     '#60a5fa', '#3b82f6', '#0b1220'),

    ('Roxo Royal',        '#7c3aed', '#7c3aed', '#5b21b6', '#f5f3ff', 'Poppins, sans-serif',
     '#a78bfa', '#8b5cf6', '#141026'),

    ('Vermelho Coral',    '#dc2626', '#dc2626', '#b91c1c', '#fef2f2', '"Open Sans", sans-serif',
     '#f87171', '#ef4444', '#1c0f10'),

    ('Laranja Sunset',    '#ea580c', '#ea580c', '#c2410c', '#fff7ed', 'Montserrat, sans-serif',
     '#fb923c', '#f97316', '#1c1310'),

    ('Cinza Moderno',     '#374151', '#374151', '#1f2937', '#f9fafb', '"Source Sans Pro", sans-serif',
     '#cbd5e1', '#94a3b8', '#111418'),

    -- ── Novos ───────────────────────────────────────────────────────────────
    ('Índigo Noturno',    '#4f46e5', '#4f46e5', '#4338ca', '#eef2ff', 'Inter, system-ui, sans-serif',
     '#818cf8', '#6366f1', '#101024'),

    ('Teal Sereno',       '#0d9488', '#0d9488', '#0f766e', '#f0fdfa', 'Nunito, sans-serif',
     '#2dd4bf', '#14b8a6', '#08191a'),

    ('Rosa Magenta',      '#db2777', '#db2777', '#be185d', '#fdf2f8', 'Poppins, sans-serif',
     '#f472b6', '#ec4899', '#1c0f18'),

    ('Âmbar Dourado',     '#b45309', '#b45309', '#92400e', '#fffbeb', 'Lato, sans-serif',
     '#fbbf24', '#f59e0b', '#1c1508'),

    ('Ciano Elétrico',    '#0891b2', '#0891b2', '#0e7490', '#ecfeff', 'Roboto, sans-serif',
     '#22d3ee', '#06b6d4', '#08191e'),

    ('Grafite Neon',      '#18181b', '#18181b', '#27272a', '#fafafa', 'Montserrat, sans-serif',
     '#a3e635', '#84cc16', '#0c0e08'),

    ('Vinho Bordô',       '#9f1239', '#9f1239', '#881337', '#fff1f2', '"Source Sans Pro", sans-serif',
     '#fb7185', '#f43f5e', '#1a0d12'),

    ('Violeta Suave',     '#9333ea', '#9333ea', '#7e22ce', '#faf5ff', 'Nunito, sans-serif',
     '#c084fc', '#a855f7', '#16101d'),

    ('Verde Lima',        '#4d7c0f', '#4d7c0f', '#3f6212', '#f7fee7', 'Lato, sans-serif',
     '#a3e635', '#84cc16', '#121a08'),

    ('Azul Meia-Noite',   '#1d4ed8', '#1d4ed8', '#1e3a8a', '#f8fafc', 'Roboto, sans-serif',
     '#93c5fd', '#60a5fa', '#070c18')

ON DUPLICATE KEY UPDATE
    preview_color         = VALUES(preview_color),
    primary_color         = VALUES(primary_color),
    secondary_color       = VALUES(secondary_color),
    background_color      = VALUES(background_color),
    font_family           = VALUES(font_family),
    dark_primary_color    = VALUES(dark_primary_color),
    dark_secondary_color  = VALUES(dark_secondary_color),
    dark_background_color = VALUES(dark_background_color);


-- ── 3. Modo escuro do tema padrão já salvo ──────────────────────────────────
--
-- Casa o trio padrão INTEIRO. Uma instituição que escolheu #0f172a de propósito
-- terá algum dos outros dois campos diferente e fica de fora.

UPDATE faculdade_temas
   SET dark_background_color = '#0d1a14'
 WHERE dark_background_color = '#0f172a'
   AND dark_primary_color    = '#34d399'
   AND dark_secondary_color  = '#10b981';
