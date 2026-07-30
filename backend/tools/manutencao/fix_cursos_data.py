# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

from sqlalchemy import text
from decimal import Decimal
from app.database import engine

conn = engine.connect()

# Corrigir cursos pagos sem valor
try:
    # Atualizar valor = 0.01 para cursos marcados como pago mas sem valor
    result = conn.execute(text(
        "UPDATE cursos SET valor = 0.01 WHERE pago = 1 AND (valor IS NULL OR valor <= 0)"
    ))
    conn.commit()
    print(f"✅ {result.rowcount} cursos foram atualizados com valor = 0.01")
    
    # Verificar resultado
    verify = conn.execute(text("SELECT id, nome, pago, valor FROM cursos WHERE pago = 1 AND (valor IS NULL OR valor <= 0)"))
    remaining = verify.fetchall()
    
    if remaining:
        print(f"⚠️  Ainda há {len(remaining)} cursos com problema:")
        for r in remaining:
            print(f"   ID {r[0]}: {r[1]}")
    else:
        print("✅ Todos os cursos pagos agora possuem valor válido!")
        
except Exception as e:
    print(f"❌ Erro ao atualizar: {e}")
finally:
    conn.close()
