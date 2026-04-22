from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE usuarios MODIFY COLUMN role ENUM('admin', 'aluno', 'instituicao') NOT NULL DEFAULT 'aluno'"))
    conn.commit()

print("Migration OK: role ENUM agora inclui 'instituicao'")
