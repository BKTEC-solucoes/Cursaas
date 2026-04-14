"""
Migração: adiciona coluna `page_overrides` (JSON) na tabela faculdade_temas.
Execute: python migrate_page_overrides.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        # Verifica se coluna já existe
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_name='faculdade_temas' AND column_name='page_overrides'"
        ))
        exists = result.scalar()
        if exists:
            print("✓ Coluna page_overrides já existe — nada a fazer.")
            return

        conn.execute(text(
            "ALTER TABLE faculdade_temas "
            "ADD COLUMN page_overrides JSON NULL "
            "COMMENT 'Overrides visuais por pagina: dashboard, alunos, cursos, aulas, notas, perfil'"
        ))
        conn.commit()
        print("✓ Coluna page_overrides adicionada com sucesso.")

if __name__ == "__main__":
    run()
