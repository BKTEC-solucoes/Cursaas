# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE usuarios MODIFY COLUMN role ENUM('admin', 'aluno', 'instituicao') NOT NULL DEFAULT 'aluno'"))
    conn.commit()

print("Migration OK: role ENUM agora inclui 'instituicao'")
