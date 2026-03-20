from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Curso, StatusCursoEnum, Usuario
from app.routes.auth import get_current_admin
from app.schemas import CursoAdminResponse

router = APIRouter()


def _get_pending_paid_course_or_404(db: Session, curso_id: int) -> Curso:
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    if not curso.pago:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas cursos pagos entram no fluxo de aprovacao",
        )

    if curso.status != StatusCursoEnum.pendente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Apenas cursos pendentes podem ser processados. Status atual: {curso.status.value}",
        )

    return curso


@router.get("/cursos", response_model=list[CursoAdminResponse])
def list_all_courses(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    cursos = db.query(Curso).order_by(Curso.data_criacao.desc()).all()
    return [CursoAdminResponse.model_validate(curso) for curso in cursos]


@router.get("/solicitacoes", response_model=list[CursoAdminResponse])
def list_pending_course_requests(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    cursos = (
        db.query(Curso)
        .filter(Curso.pago == True, Curso.status == StatusCursoEnum.pendente)
        .order_by(Curso.data_criacao.asc())
        .all()
    )
    return [CursoAdminResponse.model_validate(curso) for curso in cursos]


@router.post("/solicitacoes/{curso_id}/aprovar", response_model=CursoAdminResponse)
def approve_course_request(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    curso = _get_pending_paid_course_or_404(db, curso_id)
    curso.status = StatusCursoEnum.aprovado
    db.commit()
    db.refresh(curso)
    return CursoAdminResponse.model_validate(curso)


@router.post("/solicitacoes/{curso_id}/recusar", response_model=CursoAdminResponse)
def reject_course_request(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    curso = _get_pending_paid_course_or_404(db, curso_id)
    curso.status = StatusCursoEnum.recusado
    db.commit()
    db.refresh(curso)
    return CursoAdminResponse.model_validate(curso)
