"""
Executa a migration_temas_v3.sql via Python/pymysql.
Cada passo é idempotente — verifica antes de executar.
"""
import sys
import pymysql

HOST     = "localhost"
USER     = "root"
PASSWORD = "gahesil"
DATABASE = "cursaas"


def col_exists(cur, table, column):
    cur.execute(f"SHOW COLUMNS FROM `{table}` LIKE %s", (column,))
    return cur.fetchone() is not None


def table_exists(cur, table):
    cur.execute("SHOW TABLES LIKE %s", (table,))
    return cur.fetchone() is not None


def idx_exists(cur, table, index_name):
    cur.execute(
        "SELECT 1 FROM information_schema.STATISTICS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND INDEX_NAME = %s",
        (DATABASE, table, index_name),
    )
    return cur.fetchone() is not None


def fk_exists(cur, table, fk_name):
    cur.execute(
        "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s "
        "AND CONSTRAINT_NAME = %s AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
        (DATABASE, table, fk_name),
    )
    return cur.fetchone() is not None


def run(cur, sql, label=""):
    print(f"  -> {label or sql[:80]}")
    cur.execute(sql)


def main():
    conn = pymysql.connect(
        host=HOST, user=USER, password=PASSWORD,
        database=DATABASE, charset="utf8mb4", autocommit=True,
    )
    cur = conn.cursor()

    # ── PASSO 1: evoluir faculdade_temas ──────────────────────────────────────
    print("\n[PASSO 1] Evoluindo faculdade_temas...")

    # 1a. Adicionar colunas novas (se não existirem)
    new_cols = [
        ("id",                   "INT NOT NULL DEFAULT 0"),
        ("nome",                 "VARCHAR(100) NOT NULL DEFAULT 'Tema Padrão'"),
        ("dark_mode",            "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("dark_primary_color",   "VARCHAR(20) NOT NULL DEFAULT '#34d399'"),
        ("dark_secondary_color", "VARCHAR(20) NOT NULL DEFAULT '#10b981'"),
        ("dark_background_color","VARCHAR(20) NOT NULL DEFAULT '#0f172a'"),
        ("favicon_url",          "VARCHAR(500) NULL"),
    ]
    for colname, colddef in new_cols:
        if not col_exists(cur, "faculdade_temas", colname):
            run(cur, f"ALTER TABLE faculdade_temas ADD COLUMN `{colname}` {colddef}", f"ADD {colname}")

    # 1b. Preencher id com valores sequenciais (apenas se ainda for 0)
    cur.execute("SELECT COUNT(*) FROM faculdade_temas WHERE id = 0")
    zero_count = cur.fetchone()[0]
    if zero_count > 0:
        run(cur,
            "SET @rn = 0; UPDATE faculdade_temas SET id = (@rn := @rn + 1)",
            "Preencher id sequencial")
        # pymysql não suporta múltiplos statements na mesma execute;
        # executamos separados:
        cur.execute("SET @rn = 0")
        cur.execute("UPDATE faculdade_temas SET id = (@rn := @rn + 1)")

    # 1c. Trocar PK (faculdade_id -> id)
    # Verificar se a PK atual ainda é faculdade_id
    cur.execute(
        "SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'faculdade_temas' "
        "AND CONSTRAINT_NAME = 'PRIMARY'",
        (DATABASE,),
    )
    current_pk = [row[0] for row in cur.fetchall()]
    print(f"  PK atual: {current_pk}")

    if "id" not in current_pk:
        # Remover FKs que referenciam a PK antes de trocá-la
        if fk_exists(cur, "faculdade_temas", "faculdade_temas_ibfk_1"):
            run(cur, "ALTER TABLE faculdade_temas DROP FOREIGN KEY faculdade_temas_ibfk_1",
                "DROP FK legada")
        # Remover nova FK para poder recriar
        if fk_exists(cur, "faculdade_temas", "fk_faculdade_temas_faculdade"):
            run(cur, "ALTER TABLE faculdade_temas DROP FOREIGN KEY fk_faculdade_temas_faculdade",
                "DROP FK fk_faculdade_temas_faculdade")

        run(cur, "ALTER TABLE faculdade_temas DROP PRIMARY KEY", "DROP PK faculdade_id")
        run(cur, "ALTER TABLE faculdade_temas MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY",
            "SET id como PK AUTO_INCREMENT")

    # 1d. Recriar índice em faculdade_id
    if not idx_exists(cur, "faculdade_temas", "idx_faculdade_temas_faculdade"):
        run(cur,
            "ALTER TABLE faculdade_temas ADD INDEX idx_faculdade_temas_faculdade (faculdade_id)",
            "ADD INDEX faculdade_id")

    if not fk_exists(cur, "faculdade_temas", "fk_faculdade_temas_faculdade"):
        run(cur,
            "ALTER TABLE faculdade_temas ADD CONSTRAINT fk_faculdade_temas_faculdade "
            "FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) "
            "ON DELETE CASCADE ON UPDATE CASCADE",
            "ADD FK faculdade_temas -> faculdades")

    # ── PASSO 2: tema_ativo_id em faculdades ─────────────────────────────────
    print("\n[PASSO 2] Adicionando tema_ativo_id em faculdades...")

    if not col_exists(cur, "faculdades", "tema_ativo_id"):
        run(cur,
            "ALTER TABLE faculdades ADD COLUMN tema_ativo_id INT NULL "
            "COMMENT 'FK para faculdade_temas.id'",
            "ADD tema_ativo_id")

    # Popular: cada faculdade aponta para seu tema existente
    run(cur,
        "UPDATE faculdades f "
        "JOIN faculdade_temas t ON t.faculdade_id = f.id "
        "SET f.tema_ativo_id = t.id "
        "WHERE f.tema_ativo_id IS NULL",
        "Backfill tema_ativo_id")

    if not fk_exists(cur, "faculdades", "fk_faculdades_tema_ativo"):
        run(cur,
            "ALTER TABLE faculdades ADD CONSTRAINT fk_faculdades_tema_ativo "
            "FOREIGN KEY (tema_ativo_id) REFERENCES faculdade_temas(id) "
            "ON DELETE SET NULL ON UPDATE CASCADE",
            "ADD FK faculdades -> faculdade_temas")

    # ── PASSO 3: tema_presets ─────────────────────────────────────────────────
    print("\n[PASSO 3] Criando tema_presets...")

    if not table_exists(cur, "tema_presets"):
        run(cur, """
CREATE TABLE tema_presets (
    id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100)  NOT NULL,
    preview_color   VARCHAR(20)   NOT NULL,
    primary_color   VARCHAR(20)   NOT NULL,
    secondary_color VARCHAR(20)   NOT NULL,
    background_color VARCHAR(20)  NOT NULL,
    font_family     VARCHAR(150)  NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
    dark_primary_color    VARCHAR(20) NOT NULL DEFAULT '#34d399',
    dark_secondary_color  VARCHAR(20) NOT NULL DEFAULT '#10b981',
    dark_background_color VARCHAR(20) NOT NULL DEFAULT '#0f172a'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
""", "CREATE tema_presets")

        presets = [
            ("Verde Esmeralda", "#1a6b3c", "#1a6b3c", "#0f4b2a", "#f0fdf4",
             "Inter, system-ui, sans-serif", "#34d399", "#10b981", "#0f172a"),
            ("Azul Oceano",     "#1e40af", "#1e40af", "#1e3a8a", "#eff6ff",
             "Inter, system-ui, sans-serif", "#60a5fa", "#3b82f6", "#0f172a"),
            ("Roxo Royal",      "#7c3aed", "#7c3aed", "#5b21b6", "#f5f3ff",
             "Poppins, sans-serif", "#a78bfa", "#8b5cf6", "#1e1b2e"),
            ("Vermelho Coral",  "#dc2626", "#dc2626", "#b91c1c", "#fef2f2",
             '"Open Sans", sans-serif', "#f87171", "#ef4444", "#1a0000"),
            ("Laranja Sunset",  "#ea580c", "#ea580c", "#c2410c", "#fff7ed",
             "Montserrat, sans-serif", "#fb923c", "#f97316", "#1c1007"),
            ("Cinza Moderno",   "#374151", "#374151", "#1f2937", "#f9fafb",
             '"Source Sans Pro", sans-serif', "#9ca3af", "#6b7280", "#111827"),
        ]
        for p in presets:
            cur.execute(
                "INSERT INTO tema_presets "
                "(nome,preview_color,primary_color,secondary_color,background_color,"
                "font_family,dark_primary_color,dark_secondary_color,dark_background_color) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                p,
            )
        print(f"  -> {len(presets)} presets inseridos")
    else:
        print("  -> tema_presets já existe, pulando")

    # ── PASSO 4: view ────────────────────────────────────────────────────────
    print("\n[PASSO 4] Recriando view vw_faculdade_com_tema...")
    run(cur, """
CREATE OR REPLACE VIEW vw_faculdade_com_tema AS
SELECT
    f.id              AS faculdade_id,
    f.nome            AS faculdade_nome,
    f.slug,
    f.logo_url,
    f.tema_ativo_id,
    COALESCE(t.nome, 'Padrão')                           AS tema_nome,
    COALESCE(t.primary_color,    '#1a6b3c')              AS primary_color,
    COALESCE(t.secondary_color,  '#0f4b2a')              AS secondary_color,
    COALESCE(t.background_color, '#f0fdf4')              AS background_color,
    COALESCE(t.font_family,      'Inter, system-ui, sans-serif') AS font_family,
    COALESCE(t.dark_mode,        FALSE)                  AS dark_mode,
    COALESCE(t.dark_primary_color,    '#34d399')         AS dark_primary_color,
    COALESCE(t.dark_secondary_color,  '#10b981')         AS dark_secondary_color,
    COALESCE(t.dark_background_color, '#0f172a')         AS dark_background_color,
    t.favicon_url
FROM  faculdades f
LEFT  JOIN faculdade_temas t ON t.id = f.tema_ativo_id
""", "CREATE OR REPLACE VIEW")

    # ── Resultado final ───────────────────────────────────────────────────────
    print("\n[OK] Migração concluída. Estado final:")
    cur.execute("DESCRIBE faculdades")
    cols = [r[0] for r in cur.fetchall()]
    print(f"  faculdades colunas: {cols}")
    cur.execute("DESCRIBE faculdade_temas")
    cols2 = [r[0] for r in cur.fetchall()]
    print(f"  faculdade_temas colunas: {cols2}")
    cur.execute("SELECT COUNT(*) FROM tema_presets")
    print(f"  tema_presets linhas: {cur.fetchone()[0]}")

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
