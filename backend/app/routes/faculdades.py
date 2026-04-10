from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Faculdade, VinculoAlunoFaculdade, Usuario, RoleEnum
from app.routes.auth import get_current_super_admin, get_current_user
from app.schemas import (
    FaculdadeCreate,
    FaculdadeUpdate,
    FaculdadeResponse,
    FaculdadePageResponse,
    VinculoCreate,
    VinculoUpdate,
    VinculoResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Endpoint público (sem autenticação)
# ---------------------------------------------------------------------------

@router.get(
    "/publicas",
    summary="Listar faculdades ativas (público)",
    description="Retorna id e nome de todas as faculdades ativas. Usado no formulário de cadastro de aluno.",
)
def listar_faculdades_publicas(db: Session = Depends(get_db)):
    faculdades = (
        db.query(Faculdade.id, Faculdade.nome)
        .filter(Faculdade.ativa == True)
        .order_by(Faculdade.nome)
        .all()
    )
    return [{"id": f.id, "nome": f.nome} for f in faculdades]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _get_or_404(db: Session, faculdade_id: int) -> Faculdade:
    f = db.query(Faculdade).filter(Faculdade.id == faculdade_id).first()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculdade não encontrada")
    return f


# ---------------------------------------------------------------------------
# CRUD de Faculdades (apenas super_admin)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=FaculdadePageResponse,
    summary="Listar faculdades",
)
def listar_faculdades(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    ativa: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    q = db.query(Faculdade)
    if ativa is not None:
        q = q.filter(Faculdade.ativa == ativa)
    total = q.count()
    items = q.order_by(Faculdade.nome).offset((page - 1) * limit).limit(limit).all()
    return FaculdadePageResponse(
        items=[FaculdadeResponse.model_validate(f) for f in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=ceil(total / limit) if total else 0,
    )


@router.post(
    "/",
    response_model=FaculdadeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar faculdade",
)
def criar_faculdade(
    payload: FaculdadeCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    if db.query(Faculdade).filter(Faculdade.slug == payload.slug).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug já em uso")
    if payload.cnpj and db.query(Faculdade).filter(Faculdade.cnpj == payload.cnpj).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ já cadastrado")

    f = Faculdade(**payload.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return FaculdadeResponse.model_validate(f)


@router.get(
    "/{faculdade_id}",
    response_model=FaculdadeResponse,
    summary="Detalhe da faculdade",
)
def detalhe_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    return FaculdadeResponse.model_validate(_get_or_404(db, faculdade_id))


@router.patch(
    "/{faculdade_id}",
    response_model=FaculdadeResponse,
    summary="Atualizar faculdade",
)
def atualizar_faculdade(
    faculdade_id: int,
    payload: FaculdadeUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    f = _get_or_404(db, faculdade_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(f, field, value)
    db.commit()
    db.refresh(f)
    return FaculdadeResponse.model_validate(f)


@router.delete(
    "/{faculdade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desativar faculdade (soft delete)",
)
def desativar_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    f = _get_or_404(db, faculdade_id)
    f.ativa = False
    db.commit()


# ---------------------------------------------------------------------------
# Vínculos de alunos (admin da faculdade ou super_admin)
# ---------------------------------------------------------------------------

@router.get(
    "/{faculdade_id}/alunos",
    response_model=list[VinculoResponse],
    summary="Listar alunos vinculados à faculdade",
)
def listar_alunos_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    _get_or_404(db, faculdade_id)
    vinculos = (
        db.query(VinculoAlunoFaculdade)
        .filter(VinculoAlunoFaculdade.faculdade_id == faculdade_id)
        .all()
    )
    return [VinculoResponse.model_validate(v) for v in vinculos]


@router.post(
    "/{faculdade_id}/alunos",
    response_model=VinculoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vincular aluno à faculdade",
)
def vincular_aluno(
    faculdade_id: int,
    payload: VinculoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    _get_or_404(db, faculdade_id)

    aluno = db.query(Usuario).filter(
        Usuario.id == payload.usuario_id, Usuario.role == RoleEnum.aluno
    ).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    existente = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.usuario_id == payload.usuario_id,
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aluno já vinculado a esta faculdade")

    v = VinculoAlunoFaculdade(
        usuario_id=payload.usuario_id,
        faculdade_id=faculdade_id,
        matricula=payload.matricula,
    )
    # Atualiza faculdade_id no usuário
    aluno.faculdade_id = faculdade_id
    db.add(v)
    db.commit()
    db.refresh(v)
    return VinculoResponse.model_validate(v)


@router.patch(
    "/{faculdade_id}/alunos/{usuario_id}",
    response_model=VinculoResponse,
    summary="Atualizar vínculo do aluno",
)
def atualizar_vinculo(
    faculdade_id: int,
    usuario_id: int,
    payload: VinculoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    v = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
        VinculoAlunoFaculdade.usuario_id == usuario_id,
    ).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(v, field, value)
    db.commit()
    db.refresh(v)
    return VinculoResponse.model_validate(v)


@router.delete(
    "/{faculdade_id}/alunos/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desvincular aluno da faculdade",
)
def desvincular_aluno(
    faculdade_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    v = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
        VinculoAlunoFaculdade.usuario_id == usuario_id,
    ).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo não encontrado")
    db.delete(v)
    db.commit()


# ---------------------------------------------------------------------------
# helper de guarda de tenant
# ---------------------------------------------------------------------------

def _guard_tenant(user: Usuario, faculdade_id: int) -> None:
    """Permite acesso apenas se o usuário pertence ao tenant ou é super_admin."""
    from app.models import AdminRoleEnum as ModelAdminRoleEnum
    if user.admin_role == ModelAdminRoleEnum.super_admin:
        return
    if user.faculdade_id != faculdade_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: você não pertence a esta faculdade",
        )
