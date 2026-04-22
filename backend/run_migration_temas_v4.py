"""Executa migration_temas_v4 — adiciona campos avançados ao tema white-label."""
import pymysql

conn = pymysql.connect(
    host="localhost", port=3306,
    user="root", password="gahesil",
    database="cursaas",
)
cur = conn.cursor()

# Novos campos: (nome_coluna, definição_DDL)
COLUMNS = [
    ("border_radius",    "VARCHAR(10)  NOT NULL DEFAULT '8px' COMMENT 'Raio de borda global'"),
    ("spacing",          "ENUM('compact','comfortable','spacious') NOT NULL DEFAULT 'comfortable' COMMENT 'Densidade de espaçamento'"),
    ("button_style",     "ENUM('rounded','square','pill') NOT NULL DEFAULT 'rounded' COMMENT 'Estilo dos botões'"),
    ("shadow_level",     "ENUM('none','soft','strong') NOT NULL DEFAULT 'soft' COMMENT 'Intensidade de sombras'"),
    ("layout_type",      "ENUM('topbar','sidebar') NOT NULL DEFAULT 'topbar' COMMENT 'Navegação principal'"),
    ("gradient_enabled", "TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Aplica gradiente na cor primária'"),
]

def column_exists(table, column):
    cur.execute(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
        (table, column),
    )
    return cur.fetchone()[0] > 0

for col, definition in COLUMNS:
    if column_exists("faculdade_temas", col):
        print(f"SKIP (já existe): {col}")
    else:
        cur.execute(f"ALTER TABLE faculdade_temas ADD COLUMN {col} {definition}")
        print(f"OK  : adicionado {col}")

# Índice composto (ignora erro se já existir)
try:
    cur.execute(
        "ALTER TABLE faculdade_temas "
        "ADD INDEX idx_faculdade_temas_layout (faculdade_id, layout_type)"
    )
    print("OK  : índice idx_faculdade_temas_layout criado")
except pymysql.err.OperationalError as e:
    if e.args[0] == 1061:
        print("SKIP (índice já existe): idx_faculdade_temas_layout")
    else:
        raise

conn.commit()
cur.close()
conn.close()
print("\nMigration concluída com sucesso.")
