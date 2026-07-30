# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine, text

engine = create_engine('mysql+pymysql://root:gahesil@localhost:3306/cursaas')

columns_to_add = [
    ("content_width", "ENUM('full','boxed') NOT NULL DEFAULT 'boxed'"),
    ("sidebar_collapsible", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("layout_type", "ENUM('topbar','sidebar') NOT NULL DEFAULT 'topbar'"),
    ("anim_intensity", "ENUM('none','reduced','normal','expressive') NOT NULL DEFAULT 'normal'"),
    ("transition_type", "ENUM('instant','fade','slide','spring') NOT NULL DEFAULT 'fade'"),
    ("gradient_enabled", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("login_layout", "VARCHAR(20) NOT NULL DEFAULT 'centered'"),
    ("login_background_type", "VARCHAR(20) NOT NULL DEFAULT 'gradient'"),
    ("login_background_value", "VARCHAR(500) NULL DEFAULT NULL"),
    ("login_message_title", "VARCHAR(120) NULL DEFAULT NULL"),
    ("login_message_body", "VARCHAR(300) NULL DEFAULT NULL"),
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
