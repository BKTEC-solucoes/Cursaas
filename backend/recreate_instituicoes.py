from app.database import engine, Base
from app.models import Instituicao
from sqlalchemy import inspect, text

# Garantir que todas as tabelas sejam criadas
Base.metadata.create_all(bind=engine)

# Função de verificação do schema
def ensure_schema_updates():
    """Aplica ajustes minimos de schema em bancos ja existentes."""
    inspector = inspect(engine)

    CourseRequest = None
    try:
        from app.models import CourseRequest
    except:
        pass

    if CourseRequest:
        CourseRequest.__table__.create(bind=engine, checkfirst=True)
    
    Instituicao.__table__.create(bind=engine, checkfirst=True)

    if inspector.has_table("instituicoes"):
        inst_columns = {col["name"] for col in inspector.get_columns("instituicoes")}
        if "ativa" not in inst_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE instituicoes ADD COLUMN ativa BOOLEAN NOT NULL DEFAULT FALSE")
                )

# Chamar a função
ensure_schema_updates()

# Verificar a estrutura
inspector = inspect(engine)
if inspector.has_table('instituicoes'):
    print('✅ Tabela instituicoes criada com sucesso!')
    print('\nEstrutura:')
    cols = inspector.get_columns('instituicoes')
    for col in cols:
        print(f'  - {col["name"]}: {col["type"]}')
else:
    print('❌ Erro: tabela instituicoes não foi criada')
