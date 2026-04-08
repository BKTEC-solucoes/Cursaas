from sqlalchemy.orm import Session

from app.models import Instituicao, RoleEnum, Usuario


class InstitutionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Usuario | None:
        return self.db.query(Usuario).filter(Usuario.email == email).first()

    def get_institution_by_cnpj(self, cnpj: str) -> Instituicao | None:
        return self.db.query(Instituicao).filter(Instituicao.cnpj == cnpj).first()

    def create_institution(
        self,
        *,
        nome_instituicao: str,
        cnpj: str,
        contato: str,
        endereco: str,
    ) -> Instituicao:
        instituicao = Instituicao(
            nome_instituicao=nome_instituicao,
            cnpj=cnpj,
            contato=contato,
            endereco=endereco,
            ativa=False,
            aprovada=False,
        )
        self.db.add(instituicao)
        self.db.flush()
        return instituicao

    def create_admin_user(
        self,
        *,
        nome: str,
        email: str,
        senha_hash: str,
        instituicao_id: int,
    ) -> Usuario:
        usuario = Usuario(
            nome=nome,
            email=email,
            senha=senha_hash,
            role=RoleEnum.admin,
            instituicao_id=instituicao_id,
            ativo=True,
        )
        self.db.add(usuario)
        self.db.flush()
        return usuario
