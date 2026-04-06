from app.database import engine
from sqlalchemy import inspect, text

inspector = inspect(engine)

# Verificar estrutura da tabela usuarios
if inspector.has_table('usuarios'):
    print('Tabela usuarios encontrada. Estrutura:')
    cols = inspector.get_columns('usuarios')
    for col in cols:
        print(f'  - {col["name"]}: {col["type"]}')
    
    # Verificar foreign keys
    print('\nForeign keys:')
    fks = inspector.get_foreign_keys('usuarios')
    for fk in fks:
        print(f'  - {fk}')
else:
    print('Tabela usuarios nao existe')
