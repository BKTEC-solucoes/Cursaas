from sqlalchemy.orm import Session

from app.models import Faculdade, Instituicao, RoleEnum, Usuario



class InstitutionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Usuario | None:
        return self.db.query(Usuario).filter(Usuario.email == email).first()

    def get_institution_by_cnpj(self, cnpj: str) -> Instituicao | None:
        return self.db.query(Instituicao).filter(Instituicao.cnpj == cnpj).first()

    def get_faculdade_by_cnpj(self, cnpj: str) -> Faculdade | None:
        return self.db.query(Faculdade).filter(Faculdade.cnpj == cnpj).first()

    def get_faculdade_by_slug(self, slug: str) -> Faculdade | None:
        return self.db.query(Faculdade).filter(Faculdade.slug == slug).first()

    def create_faculdade(
        self,
        *,
        nome: str,
        slug: str,
        cnpj: str | None,
        email_contato: str | None,
        telefone: str | None,
    ) -> Faculdade:
        faculdade = Faculdade(
            nome=nome,
            slug=slug,
            cnpj=cnpj if cnpj else None,
            email_contato=email_contato,
            telefone=telefone,
            ativa=False,
            aprovada=False,
        )
        self.db.add(faculdade)
        self.db.flush()
        return faculdade

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
        faculdade_id: int | None = None,
    ) -> Usuario:
        usuario = Usuario(
            nome=nome,
            email=email,
            senha=senha_hash,
            role=RoleEnum.instituicao,
            instituicao_id=instituicao_id,
            faculdade_id=faculdade_id,
            ativo=True,
        )
        self.db.add(usuario)
        self.db.flush()
        return usuario
