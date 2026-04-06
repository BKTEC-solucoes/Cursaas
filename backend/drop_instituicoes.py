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
