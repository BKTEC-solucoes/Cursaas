# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from app.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    # Desabilitar foreign keys
    conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    
    # Remover o constraint de foreign key
    print("Removendo constraint fk_usuarios_instituicao_id...")
    try:
        conn.execute(text("ALTER TABLE usuarios DROP FOREIGN KEY fk_usuarios_instituicao_id"))
        print("✅ Constraint removido")
    except Exception as e:
        print(f"Constraint não encontrado ou já removido: {e}")
    
    # Remover a coluna
    print("Removendo coluna instituicao_id...")
    try:
        conn.execute(text("ALTER TABLE usuarios DROP COLUMN instituicao_id"))
        print("✅ Coluna removida com sucesso")
    except Exception as e:
        print(f"Erro ao remover coluna: {e}")
    
    # Reabilitar foreign keys
    conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    print("Foreign keys reabilitadas")
