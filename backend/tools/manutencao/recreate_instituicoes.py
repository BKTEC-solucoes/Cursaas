# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from app.database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)

with engine.begin() as conn:
    # Desabilitar foreign keys
    conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    
    # Dropar tabela se existir
    if inspector.has_table('instituicoes'):
        print("Dropando tabela instituicoes...")
        try:
            conn.execute(text("DROP TABLE instituicoes"))
            print("✅ Tabela dropada")
        except Exception as e:
            print(f"Erro: {e}")
    
    # Reabilitar foreign keys
    conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

# Agora recriar apenas com as colunas corretas
from app.database import Base
from app.models import Instituicao

Instituicao.__table__.create(bind=engine, checkfirst=True)

inspector = inspect(engine)
if inspector.has_table('instituicoes'):
    print('\n✅ Tabela instituicoes recriada com sucesso!')
    print('\nEstrutura:')
    cols = inspector.get_columns('instituicoes')
    for col in cols:
        print(f'  - {col["name"]}: {col["type"]}')
else:
    print('\n❌ Erro: tabela instituicoes não foi criada')
