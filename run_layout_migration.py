from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://root:gahesil@localhost:3306/cursaas')

columns_to_add = [
    ("content_width", "ENUM('full','boxed') NOT NULL DEFAULT 'boxed'"),
    ("sidebar_collapsible", "TINYINT(1) NOT NULL DEFAULT 1"),
]

with engine.connect() as conn:
    for col_name, col_def in columns_to_add:
        # Verifica se a coluna já existe
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA='cursaas' AND TABLE_NAME='faculdade_temas' AND COLUMN_NAME=:col"
        ), {"col": col_name})
        exists = result.scalar()
        if exists:
            print(f"SKIP (já existe): {col_name}")
        else:
            conn.execute(text(f"ALTER TABLE faculdade_temas ADD COLUMN {col_name} {col_def}"))
            print(f"OK: {col_name} adicionada")
    conn.commit()

print("Migração concluída.")
