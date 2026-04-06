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
