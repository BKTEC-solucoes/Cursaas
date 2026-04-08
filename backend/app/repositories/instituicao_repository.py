from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Instituicao, StatusInstituicaoEnum


class InstituicaoRepository:

    @staticmethod
    def get_by_id(db: Session, instituicao_id: int) -> Optional[Instituicao]:
        return db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()

    @staticmethod
    def get_by_cnpj(db: Session, cnpj: str) -> Optional[Instituicao]:
        return db.query(Instituicao).filter(Instituicao.cnpj == cnpj).first()

    @staticmethod
    def list_all(db: Session) -> list[Instituicao]:
        return (
            db.query(Instituicao)
            .order_by(Instituicao.data_criacao.desc())
            .all()
        )

    @staticmethod
    def list_paginado(
        db: Session,
        status: Optional[StatusInstituicaoEnum],
        page: int,
        limit: int,
    ) -> tuple[list[Instituicao], int]:
        """Retorna (items, total) com filtro opcional de status (aprovado/recusado) e paginação."""
        query = db.query(Instituicao)

        if status is not None:
            # Mapear enum para boolean: aprovado=True, recusado=False, pendente=não aprovada e not recusado
            if status == StatusInstituicaoEnum.aprovado:
                query = query.filter(Instituicao.aprovada == True)
            elif status == StatusInstituicaoEnum.recusado:
                query = query.filter(Instituicao.aprovada == False)
            # else: pendente - não fazer filtro adicional

        total = query.count()
        items = (
            query
            .order_by(Instituicao.data_criacao.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def list_pendentes(db: Session) -> list[Instituicao]:
        return (
            db.query(Instituicao)
            .filter(Instituicao.aprovada == False)
            .order_by(Instituicao.data_criacao.asc())
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
            nome_instituicao=nome,
            contato=email,  # Usar email como contato para compatibilidade
            endereco=descricao or "",
            cnpj=cnpj,
            ativa=True,
            aprovada=False,
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
        # Mapear status antigo para novo (aprovado = True, recusado = False)
        if novo_status == StatusInstituicaoEnum.aprovado:
            inst.aprovada = True
        elif novo_status == StatusInstituicaoEnum.recusado:
            inst.aprovada = False
        db.commit()
        db.refresh(inst)
        return inst

    @staticmethod
    def set_ativa(db: Session, inst: Instituicao, ativa: bool) -> Instituicao:
        inst.ativa = ativa
        db.commit()
        db.refresh(inst)
        return inst
