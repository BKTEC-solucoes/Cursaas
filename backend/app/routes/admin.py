from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Curso, StatusCursoEnum, Usuario
from app.models import Instituicao, StatusInstituicaoEnum
from app.routes.auth import get_current_admin, get_current_super_admin
from app.schemas import CursoAdminResponse, InstituicaoResponse, InstituicaoStatusUpdate
from app.security.tenant import TenantContext, tenant_context

router = APIRouter()


def _get_pending_paid_course_or_404(db: Session, curso_id: int, tc: TenantContext) -> Curso:
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    # Sem isto um admin da faculdade A aprovava/recusava curso da faculdade B.
    tc.assert_access(curso.faculdade_id)

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
    tc: TenantContext = Depends(tenant_context),
):
    """Lista cursos para o admin. Instrutores veem apenas seus cursos, super admin vê todos."""
    from app.services.admin_course_access import get_allowed_course_ids

    query = tc.filter_query(db.query(Curso), Curso.faculdade_id)

    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(Curso.id.in_(allowed))

    cursos = query.order_by(Curso.data_criacao.desc()).all()
    return [CursoAdminResponse.model_validate(curso) for curso in cursos]


@router.get("/solicitacoes", response_model=list[CursoAdminResponse])
def list_pending_course_requests(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    tc: TenantContext = Depends(tenant_context),
):
    query = db.query(Curso).filter(
        Curso.pago == True,
        Curso.status == StatusCursoEnum.pendente,
    )
    query = tc.filter_query(query, Curso.faculdade_id)
    cursos = query.order_by(Curso.data_criacao.asc()).all()
    return [CursoAdminResponse.model_validate(curso) for curso in cursos]


@router.post("/solicitacoes/{curso_id}/aprovar", response_model=CursoAdminResponse)
def approve_course_request(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    tc: TenantContext = Depends(tenant_context),
):
    curso = _get_pending_paid_course_or_404(db, curso_id, tc)
    curso.status = StatusCursoEnum.aprovado
    db.commit()
    db.refresh(curso)
    return CursoAdminResponse.model_validate(curso)


@router.post("/solicitacoes/{curso_id}/recusar", response_model=CursoAdminResponse)
def reject_course_request(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    tc: TenantContext = Depends(tenant_context),
):
    curso = _get_pending_paid_course_or_404(db, curso_id, tc)
    curso.status = StatusCursoEnum.recusado
    db.commit()
    db.refresh(curso)
    return CursoAdminResponse.model_validate(curso)


# ==================== INSTITUIÇÕES ====================

@router.get("/instituicoes", response_model=list[InstituicaoResponse])
def list_instituicoes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    instituicoes = (
        db.query(Instituicao)
        .order_by(Instituicao.data_criacao.desc())
        .all()
    )
    return [InstituicaoResponse.model_validate(inst) for inst in instituicoes]


@router.patch("/instituicoes/{instituicao_id}/status", response_model=InstituicaoResponse)
def update_instituicao_status(
    instituicao_id: int,
    body: InstituicaoStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    inst = db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instituição {instituicao_id} não encontrada",
        )

    # Mapear status para aprovada/recusada
    if body.status == StatusInstituicaoEnum.aprovado.value:
        inst.aprovada = True
    elif body.status == StatusInstituicaoEnum.recusado.value:
        inst.aprovada = False

    db.commit()
    db.refresh(inst)
    return InstituicaoResponse.model_validate(inst)
