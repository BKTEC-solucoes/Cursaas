from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import StatusInstituicaoEnum, Usuario
from app.routes.auth import get_current_super_admin
from app.schemas import InstituicaoCreate, InstituicaoPageResponse, InstituicaoResponse, AcessoInstituicaoUpdate
from app.services.instituicao_service import InstituicaoService

router = APIRouter()


@router.get(
    "/",
    response_model=InstituicaoPageResponse,
    summary="Listar faculdades",
    description=(
        "Retorna todas as faculdades com paginação. "
        "Use **status** para filtrar por `pendente`, `aprovado` ou `recusado`."
    ),
)
def listar(
    status: Optional[StatusInstituicaoEnum] = Query(
        default=None,
        description="Filtrar por status: pendente | aprovado | recusado",
    ),
    page: int = Query(default=1, ge=1, description="Número da página"),
    limit: int = Query(default=20, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    return InstituicaoService.listar(db, status, page, limit)


@router.get(
    "/{instituicao_id}",
    response_model=InstituicaoResponse,
    summary="Detalhe da faculdade",
    description="Retorna todos os dados de uma instituição pelo ID. Requer perfil admin.",
)
def detalhe(
    instituicao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    inst = InstituicaoService.obter_por_id(db, instituicao_id)
    return InstituicaoResponse.model_validate(inst)


@router.post(
    "/",
    response_model=InstituicaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar solicitação de instituição",
    description="Cadastra uma nova instituição. O status inicial é **PENDENTE**.",
)
def criar_solicitacao(
    payload: InstituicaoCreate,
    db: Session = Depends(get_db),
):
    inst = InstituicaoService.criar_solicitacao(db, payload)
    return InstituicaoResponse.model_validate(inst)


@router.get(
    "/pendentes",
    response_model=list[InstituicaoResponse],
    summary="Listar instituições pendentes",
    description="Retorna todas as instituições com status **PENDENTE**. Requer perfil admin.",
)
def listar_pendentes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    return [
        InstituicaoResponse.model_validate(inst)
        for inst in InstituicaoService.listar_pendentes(db)
    ]


@router.put(
    "/{instituicao_id}/aprovar",
    response_model=InstituicaoResponse,
    summary="Aprovar instituição",
    description="Altera o status para **APROVADO** e registra a data de aprovação. Requer perfil admin.",
)
def aprovar(
    instituicao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    inst = InstituicaoService.aprovar(db, instituicao_id)
    return InstituicaoResponse.model_validate(inst)


@router.put(
    "/{instituicao_id}/recusar",
    response_model=InstituicaoResponse,
    summary="Recusar instituição",
    description="Altera o status para **RECUSADO**. Requer perfil admin.",
)
def recusar(
    instituicao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    inst = InstituicaoService.recusar(db, instituicao_id)
    return InstituicaoResponse.model_validate(inst)


@router.patch(
    "/{instituicao_id}/acesso",
    response_model=InstituicaoResponse,
    summary="Ativar ou desativar acesso da instituição",
    description=(
        "Define se a instituição tem acesso ao sistema. "
        "`ativa=true` → Acesso Permitido, `ativa=false` → Acesso Negado. "
        "Só é possível ativar instituições com status **aprovado**."
    ),
)
def alterar_acesso(
    instituicao_id: int,
    body: AcessoInstituicaoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    if body.ativa:
        inst = InstituicaoService.ativar(db, instituicao_id)
    else:
        inst = InstituicaoService.desativar(db, instituicao_id)
    return InstituicaoResponse.model_validate(inst)
