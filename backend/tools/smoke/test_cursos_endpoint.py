# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import sys
import json
from app.routes.cursos import _list_public_courses
from app.database import SessionLocal
from app.schemas import CursoResponse

db = SessionLocal()

try:
    cursos = _list_public_courses(db)
    print(f"Total de cursos públicos: {len(cursos)}")
    
    if cursos:
        for curso in cursos[:3]:
            print(f"\nCurso ID {curso.id}:")
            print(f"  Nome: {curso.nome}")
            print(f"  Status: {curso.status}")
            print(f"  Ativo: {curso.ativo}")
            
            # Try to convert to response schema
            response = CursoResponse.model_validate(curso)
            print(f"  Response: {response.model_dump_json(indent=2)}")
finally:
    db.close()
