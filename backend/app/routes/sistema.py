"""
Painel de sistema — administração da plataforma, fora de qualquer instituição.

O painel administrativo trabalha *dentro* de uma faculdade por vez (ver
``app/security/tenant.py``): listagens filtram por ``X-Faculdade-Id``, criação
carimba a instituição em gestão. Isso é o correto para curso, aula, prova,
aluno e para os admins **daquela** instituição — mas não para o super admin,
que por definição não pertence a tenant nenhum.

Estas rotas são o outro lado: escopo global, sem ``TenantContext``, restritas a
super admins. Elas são a **única** porta de entrada para criar contas de super
admin — ``/api/auth/admin-registro`` recusa ``admin_role=super_admin`` de
propósito, para que ninguém promova uma conta de dentro do painel de uma
instituição.

GET    /api/sistema/super-admins        → lista global de super admins
POST   /api/sistema/super-admins        → cria super admin (sem faculdade)
PUT    /api/sistema/super-admins/{id}   → edita dados / ativa / desativa
DELETE /api/sistema/super-admins/{id}   → remove permanentemente
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminCurso, AdminRoleEnum, RoleEnum, Usuario
from app.routes.auth import get_current_super_admin
from app.schemas import (
    SuperAdminCreate,
    SuperAdminListResponse,
    SuperAdminResponse,
    SuperAdminUpdate,
)
from app.services.auth_service import AuthService

router = APIRouter()


def _to_response(usuario: Usuario) -> SuperAdminResponse:
    return SuperAdminResponse(
        id=usuario.id,
        nome=usuario.nome,
        email=usuario.email,
        foto_perfil=usuario.foto_perfil,
        ativo=usuario.ativo,
        data_criacao=usuario.data_criacao,
        faculdade_id=usuario.faculdade_id,
        faculdade_nome=usuario.faculdade.nome if usuario.faculdade else None,
        telefone=usuario.telefone,
        sexo=usuario.sexo,
        data_nascimento=usuario.data_nascimento,
        cpf_rg=usuario.cpf_rg,
        cep=usuario.cep,
        endereco=usuario.endereco,
    )


def _query_super_admins(db: Session):
    return db.query(Usuario).filter(
        Usuario.role == RoleEnum.admin,
        Usuario.admin_role == AdminRoleEnum.super_admin,
    )


def _buscar_super_admin(db: Session, super_admin_id: int) -> Usuario:
    alvo = _query_super_admins(db).filter(Usuario.id == super_admin_id).first()
    if not alvo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Super admin não encontrado",
        )
    return alvo


def _assert_nao_e_o_ultimo(db: Session, alvo: Usuario) -> None:
    """
    Impede que a plataforma fique sem nenhum super admin ativo — sem um deles
    não há como cadastrar instituições nem recriar a própria conta.
    """
    restantes = (
        _query_super_admins(db)
        .filter(Usuario.id != alvo.id, Usuario.ativo == True)
        .count()
    )
    if restantes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este é o último super admin ativo — crie outro antes de removê-lo",
        )


# ── Listagem ─────────────────────────────────────────────────────────────────

@router.get("/super-admins", response_model=SuperAdminListResponse)
def listar_super_admins(
    busca: Optional[str] = None,
    ativo: Optional[bool] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    """Lista todos os super admins da plataforma — visão global, sem tenant."""
    query = _query_super_admins(db)

    if busca:
        termo = f"%{busca.strip().lower()}%"
        query = query.filter(
            (func.lower(Usuario.nome).like(termo))
            | (func.lower(Usuario.email).like(termo))
        )

    if ativo is not None:
        query = query.filter(Usuario.ativo == ativo)

    total = query.count()

    if page_size < 1:
        page_size = 10
    if page_size > 100:
        page_size = 100
    if page < 1:
        page = 1

    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    itens = (
        query.order_by(Usuario.nome.asc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return SuperAdminListResponse(
        items=[_to_response(u) for u in itens],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ── Criação ──────────────────────────────────────────────────────────────────

@router.post(
    "/super-admins",
    response_model=SuperAdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_super_admin(
    dados: SuperAdminCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    email = dados.email.strip().lower()
    if db.query(Usuario).filter(func.lower(Usuario.email) == email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado",
        )

    usuario = AuthService.create_user(
        db=db,
        email=email,
        nome=dados.nome.strip(),
        senha=dados.senha,
        role="admin",
        admin_role=AdminRoleEnum.super_admin,
        # Sem faculdade: super admin administra a plataforma, não uma instituição.
        faculdade_id=None,
        foto_perfil=dados.foto_perfil,
        telefone=dados.telefone,
        sexo=dados.sexo,
        data_nascimento=dados.data_nascimento,
        cpf_rg=dados.cpf_rg,
        cep=dados.cep,
        endereco=dados.endereco,
    )
    return _to_response(usuario)


# ── Edição ───────────────────────────────────────────────────────────────────

@router.put("/super-admins/{super_admin_id}", response_model=SuperAdminResponse)
def editar_super_admin(
    super_admin_id: int,
    dados: SuperAdminUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    alvo = _buscar_super_admin(db, super_admin_id)

    if dados.email and dados.email.strip().lower() != alvo.email.lower():
        novo_email = dados.email.strip().lower()
        existe = (
            db.query(Usuario)
            .filter(func.lower(Usuario.email) == novo_email, Usuario.id != alvo.id)
            .first()
        )
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já registrado",
            )
        alvo.email = novo_email

    if dados.ativo is not None and dados.ativo != alvo.ativo:
        if alvo.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode desativar a sua própria conta",
            )
        if not dados.ativo:
            _assert_nao_e_o_ultimo(db, alvo)
        alvo.ativo = dados.ativo

    if dados.nome:
        alvo.nome = dados.nome.strip()
    if dados.foto_perfil is not None:
        alvo.foto_perfil = dados.foto_perfil
    if dados.telefone is not None:
        alvo.telefone = dados.telefone
    if dados.sexo is not None:
        alvo.sexo = dados.sexo
    if dados.data_nascimento is not None:
        alvo.data_nascimento = dados.data_nascimento
    if dados.cpf_rg is not None:
        alvo.cpf_rg = dados.cpf_rg
    if dados.cep is not None:
        alvo.cep = dados.cep
    if dados.endereco is not None:
        alvo.endereco = dados.endereco

    db.commit()
    db.refresh(alvo)
    return _to_response(alvo)


# ── Remoção ──────────────────────────────────────────────────────────────────

@router.delete("/super-admins/{super_admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_super_admin(
    super_admin_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    if current_user.id == super_admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta",
        )

    alvo = _buscar_super_admin(db, super_admin_id)
    _assert_nao_e_o_ultimo(db, alvo)

    db.query(AdminCurso).filter(AdminCurso.admin_id == alvo.id).delete()
    db.delete(alvo)
    db.commit()
