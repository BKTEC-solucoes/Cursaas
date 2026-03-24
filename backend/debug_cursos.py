from sqlalchemy import inspect, text
from app.database import engine

conn = engine.connect()
inspector = inspect(engine)

# Check columns in cursos table
print("Colunas da tabela cursos:")
columns = inspector.get_columns('cursos')
for col in columns:
    print(f"  - {col['name']} ({col['type']})")

print("\n" + "="*50)

# Check total cursos
total = conn.execute(text("SELECT COUNT(*) FROM cursos")).scalar()
print(f"Total de cursos: {total}")

# Check aprovados e ativos
aprovados = conn.execute(text("SELECT COUNT(*) FROM cursos WHERE status = 'aprovado' AND ativo = 1")).scalar()
print(f"Cursos aprovados e ativos: {aprovados}")

# List all cursos with correct column names
print("\nPrimeiros 3 cursos (primeiros 5 campos):")
result = conn.execute(text("SELECT id, nome, status, ativo, descricao FROM cursos LIMIT 3"))
for row in result:
    print(f"  ID: {row[0]}, Nome: {row[1]}, Status: {row[2]}, Ativo: {row[3]}")
