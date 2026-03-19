"""Migration: aumenta o tamanho da coluna foto_perfil para LONGTEXT."""
import sys
import os

# Garante que o path do app está disponível
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings
from app.database import engine
from sqlalchemy import text

MIGRATE_FOTO_PERFIL = """
ALTER TABLE usuarios
  MODIFY COLUMN foto_perfil LONGTEXT NULL
"""

with engine.connect() as conn:
    # Verifica o tipo atual da coluna
    result = conn.execute(text(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = 'usuarios' "
        "AND COLUMN_NAME = 'foto_perfil'"
    ))
    
    current_type = result.scalar()
    
    if current_type and current_type.upper().startswith('VARCHAR'):
        conn.execute(text(MIGRATE_FOTO_PERFIL))
        conn.commit()
        print(f"✔ Coluna foto_perfil alterada de {current_type} para LONGTEXT.")
    elif current_type and current_type.upper() == 'LONGTEXT':
        print("ℹ Coluna foto_perfil já é LONGTEXT.")
    else:
        print(f"ℹ Tipo atual de foto_perfil: {current_type}")
