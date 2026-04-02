from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Instituicao, StatusInstituicaoEnum


class InstituicaoRepository:

    @staticmethod
    def get_by_id(db: Session, instituicao_id: int) -> Optional[Instituicao]:
        return db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Instituicao]:
        return db.query(Instituicao).filter(Instituicao.email == email).first()

    @staticmethod
    def get_by_cnpj(db: Session, cnpj: str) -> Optional[Instituicao]:
        return db.query(Instituicao).filter(Instituicao.cnpj == cnpj).first()

    @staticmethod
    def list_all(db: Session) -> list[Instituicao]:
        return (
            db.query(Instituicao)
            .order_by(Instituicao.data_solicitacao.desc())
            .all()
        )

    @staticmethod
    def list_paginado(
        db: Session,
        status: Optional[StatusInstituicaoEnum],
        page: int,
        limit: int,
    ) -> tuple[list[Instituicao], int]:
        """Retorna (items, total) com filtro opcional de status e paginação."""
        query = db.query(Instituicao)

        if status is not None:
            query = query.filter(Instituicao.status == status)

        total = query.count()
        items = (
            query
            .order_by(Instituicao.data_solicitacao.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def list_pendentes(db: Session) -> list[Instituicao]:
        return (
            db.query(Instituicao)
            .filter(Instituicao.status == StatusInstituicaoEnum.pendente)
            .order_by(Instituicao.data_solicitacao.asc())
            .all()
        )

    @staticmethod
    def create(
        db: Session,
        nome: str,
        email: str,
        cnpj: str,
        descricao: Optional[str],
    ) -> Instituicao:
        inst = Instituicao(
            nome=nome,
            email=email,
            cnpj=cnpj,
            descricao=descricao,
            status=StatusInstituicaoEnum.pendente,
            data_solicitacao=datetime.utcnow(),
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)
        return inst

    @staticmethod
    def set_status(
        db: Session,
        inst: Instituicao,
        novo_status: StatusInstituicaoEnum,
    ) -> Instituicao:
        inst.status = novo_status
        if novo_status == StatusInstituicaoEnum.aprovado:
            inst.data_aprovacao = datetime.utcnow()
        db.commit()
        db.refresh(inst)
        return inst

    @staticmethod
    def set_ativa(db: Session, inst: Instituicao, ativa: bool) -> Instituicao:
        inst.ativa = ativa
        db.commit()
        db.refresh(inst)
        return inst
