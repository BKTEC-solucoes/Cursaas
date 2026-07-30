# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)
if inspector.has_table('instituicoes'):
    print('Tabela instituicoes encontrada. Estrutura atual:')
    cols = inspector.get_columns('instituicoes')
    for col in cols:
        print(f'  - {col["name"]}: {col["type"]}')
else:
    print('Tabela instituicoes nao existe no banco')
