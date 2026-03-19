"""Migration: cria tabela admin_cursos para vínculo de permissões por curso."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS admin_cursos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    curso_id INT NOT NULL,
    data_vinculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_admin_curso (admin_id, curso_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_curso_id (curso_id)
)
"""

with engine.connect() as conn:
    conn.execute(text(CREATE_TABLE))
    conn.commit()

print("✔ Tabela admin_cursos criada/verificada com sucesso.")
