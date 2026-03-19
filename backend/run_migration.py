"""Migration: adiciona colunas admin_role/foto_perfil e tabela admin_cursos."""
import sys
import os

# Garante que o path do app está disponível
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database import engine
from sqlalchemy import text

ADD_ADMIN_ROLE = """
ALTER TABLE usuarios
  ADD COLUMN admin_role ENUM('super_admin','instrutor','financeiro','suporte')
    NULL DEFAULT NULL
    AFTER `role`
"""

ADD_FOTO_PERFIL = """
ALTER TABLE usuarios
  ADD COLUMN foto_perfil LONGTEXT
    NULL
    AFTER admin_role
"""

ADD_INDEX = "ALTER TABLE usuarios ADD INDEX idx_admin_role (admin_role)"

CREATE_ADMIN_CURSOS = """
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
    # Verifica e adiciona admin_role
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = 'usuarios' "
        "AND COLUMN_NAME = 'admin_role'"
    ))
    if result.scalar() == 0:
        conn.execute(text(ADD_ADMIN_ROLE))
        conn.commit()
        print("✔ Coluna admin_role adicionada com sucesso.")
        try:
            conn.execute(text(ADD_INDEX))
            conn.commit()
            print("✔ Índice idx_admin_role criado.")
        except Exception as e:
            print(f"Aviso ao criar índice: {e}")
    else:
        print("ℹ Coluna admin_role já existe.")

    # Verifica e adiciona foto_perfil
    result = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = 'usuarios' "
        "AND COLUMN_NAME = 'foto_perfil'"
    ))
    if result.scalar() == 0:
        conn.execute(text(ADD_FOTO_PERFIL))
        conn.commit()
        print("✔ Coluna foto_perfil adicionada com sucesso.")
    else:
        # Garante tipo LONGTEXT para suportar base64
        conn.execute(text("ALTER TABLE usuarios MODIFY COLUMN foto_perfil LONGTEXT NULL"))
        conn.commit()
        print("ℹ Coluna foto_perfil já existe (ajustada para LONGTEXT).")

    # Criar tabela de vínculo admin-curso
    conn.execute(text(CREATE_ADMIN_CURSOS))
    conn.commit()
    print("✔ Tabela admin_cursos criada/verificada.")

print("✓ Migration concluída.")

