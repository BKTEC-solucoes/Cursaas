# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from sqlalchemy import text
from app.database import engine

conn = engine.connect()

# Corrigir os cursos com pago=1 mas sem valor (setting pago=0 para cursos de teste)
cursos_problemáticos = [16, 17, 18]

for curso_id in cursos_problemáticos:
    conn.execute(text(f"UPDATE cursos SET pago = 0, valor = NULL WHERE id = {curso_id}"))
    conn.commit()
    print(f"✅ Curso ID {curso_id} corrigido: pago = 0")

print("\n✅ Todos os cursos foram corrigidos!")

# Verificar
result = conn.execute(text("SELECT id, nome, pago, valor FROM cursos WHERE pago = 1 AND (valor IS NULL OR valor <= 0)"))
rows = result.fetchall()
print(f"\nCursos com problema restantes: {len(rows)}")

# Listar cursos public novamente
result = conn.execute(text("SELECT COUNT(*) FROM cursos WHERE status = 'aprovado' AND ativo = 1"))
count = result.scalar()
print(f"Cursos aprovados e ativos agora: {count}")
