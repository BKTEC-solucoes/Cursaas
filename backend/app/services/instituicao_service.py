from fastapi import HTTPException, status
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Instituicao, StatusInstituicaoEnum
from app.repositories.instituicao_repository import InstituicaoRepository
from app.schemas import InstituicaoCreate, InstituicaoPageResponse, InstituicaoResponse


class InstituicaoService:

    @staticmethod
    def listar(
        db: Session,
        status_filtro: Optional[StatusInstituicaoEnum],
        page: int,
        limit: int,
    ) -> InstituicaoPageResponse:
        items, total = InstituicaoRepository.list_paginado(db, status_filtro, page, limit)
        total_pages = max(1, -(-total // limit))  # divisão de teto
        return InstituicaoPageResponse(
            items=[InstituicaoResponse.model_validate(i) for i in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    @staticmethod
    def criar_solicitacao(db: Session, payload: InstituicaoCreate) -> Instituicao:
        if InstituicaoRepository.get_by_email(db, payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe uma instituição cadastrada com este e-mail.",
            )

        cnpj_normalizado = _normalizar_cnpj(payload.cnpj)
        if InstituicaoRepository.get_by_cnpj(db, cnpj_normalizado):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe uma instituição cadastrada com este CNPJ.",
            )

        return InstituicaoRepository.create(
            db,
            nome=payload.nome,
            email=payload.email,
            cnpj=cnpj_normalizado,
            descricao=payload.descricao,
        )

    @staticmethod
    def obter_por_id(db: Session, instituicao_id: int) -> Instituicao:
        return _get_or_404(db, instituicao_id)

    @staticmethod
    def listar_pendentes(db: Session) -> list[Instituicao]:
        return InstituicaoRepository.list_pendentes(db)

    @staticmethod
    def aprovar(db: Session, instituicao_id: int) -> Instituicao:
        inst = _get_or_404(db, instituicao_id)

        if inst.status == StatusInstituicaoEnum.aprovado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Instituição já está aprovada.",
            )

        return InstituicaoRepository.set_status(db, inst, StatusInstituicaoEnum.aprovado)

    @staticmethod
    def recusar(db: Session, instituicao_id: int) -> Instituicao:
        inst = _get_or_404(db, instituicao_id)

        if inst.status == StatusInstituicaoEnum.recusado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Instituição já está recusada.",
            )

        return InstituicaoRepository.set_status(db, inst, StatusInstituicaoEnum.recusado)

    @staticmethod
    def ativar(db: Session, instituicao_id: int) -> Instituicao:
        inst = _get_or_404(db, instituicao_id)
        if inst.status != StatusInstituicaoEnum.aprovado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Só é possível ativar instituições com status 'aprovado'.",
            )
        return InstituicaoRepository.set_ativa(db, inst, True)

    @staticmethod
    def desativar(db: Session, instituicao_id: int) -> Instituicao:
        inst = _get_or_404(db, instituicao_id)
        return InstituicaoRepository.set_ativa(db, inst, False)


# ── helpers privados ─────────────────────────────────────────────────────────

def _get_or_404(db: Session, instituicao_id: int) -> Instituicao:
    inst = InstituicaoRepository.get_by_id(db, instituicao_id)
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Instituição {instituicao_id} não encontrada.",
        )
    return inst


def _normalizar_cnpj(cnpj: str) -> str:
    """Remove pontuação do CNPJ, mantendo apenas dígitos e barras relevantes."""
    return cnpj.strip()
