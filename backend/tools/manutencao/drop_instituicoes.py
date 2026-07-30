# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)

# Verificar se há dados na tabela antes de dropar
if inspector.has_table('instituicoes'):
    with engine.begin() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM instituicoes"))
        count = result.scalar()
        print(f"Registros na tabela instituicoes: {count}")
        
        # Desabilitar foreign keys
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        print("Foreign keys desabilitadas")
        
        print("\nDropando tabela instituicoes...")
        conn.execute(text("DROP TABLE instituicoes"))
        print("✅ Tabela dropada com sucesso")
        
        # Reabilitar foreign keys
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        print("Foreign keys reabilitadas")
