from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import InscricaoCurso, Usuario, Curso, Aula, Prova
from app.schemas import CursoDetailResponse

router = APIRouter()

@router.get("/")
def list_alunos():
    """Lista todos os alunos (admin)"""
    return {"message": "Listar alunos - TODO"}

@router.post("/")
def create_aluno():
    """Cria um novo aluno (admin)"""
    return {"message": "Criar aluno - TODO"}

@router.get("/{aluno_id}")
def get_aluno(aluno_id: int):
    """Obtém detalhes de um aluno (admin)"""
    return {"message": f"Obter aluno {aluno_id} - TODO"}

@router.put("/{aluno_id}")
def update_aluno(aluno_id: int):
    """Atualiza informações de um aluno (admin)"""
    return {"message": f"Atualizar aluno {aluno_id} - TODO"}

@router.delete("/{aluno_id}")
def delete_aluno(aluno_id: int):
    """Deleta um aluno (admin)"""
    return {"message": f"Deletar aluno {aluno_id} - TODO"}

@router.get("/{aluno_id}/cursos", response_model=list[CursoDetailResponse])
def get_cursos_aluno(aluno_id: int, db: Session = Depends(get_db)):
    """Lista os cursos em que o aluno está inscrito, com aulas e provas."""
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aluno_id} não encontrado")

    inscricoes = (
        db.query(InscricaoCurso)
        .options(
            joinedload(InscricaoCurso.curso).joinedload(Curso.aulas),
            joinedload(InscricaoCurso.curso).joinedload(Curso.provas),
        )
        .filter(InscricaoCurso.usuario_id == aluno_id)
        .all()
    )

    cursos = []
    for inscricao in inscricoes:
        if not inscricao.curso:
            continue
        cursos.append(CursoDetailResponse.model_validate(inscricao.curso))

    print(f"[alunos] get_cursos_aluno aluno_id={aluno_id} retornou {len(cursos)} curso(s)")
    return cursos
