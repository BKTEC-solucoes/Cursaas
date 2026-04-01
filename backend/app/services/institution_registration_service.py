import re

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories import InstitutionRepository
from app.schemas import InstituicaoCreate, TokenResponse, UsuarioResponse
from app.services.auth_service import AuthService


class InstitutionRegistrationError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InstitutionRegistrationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = InstitutionRepository(db)

    async def register(self, dados: InstituicaoCreate) -> TokenResponse:
        email = dados.email.strip().lower()
        cnpj = self._format_cnpj(dados.cnpj)
        contato = self._normalize_contact(dados.contato)

        self._validate_cnpj(cnpj)

        if self.repository.get_user_by_email(email):
            raise InstitutionRegistrationError("Este email ja esta em uso.")

        if self.repository.get_institution_by_cnpj(cnpj):
            raise InstitutionRegistrationError("Ja existe uma instituicao cadastrada com este CNPJ.")

        try:
            nome_admin = (dados.nome_responsavel or dados.nome_instituicao).strip()
            instituicao = self.repository.create_institution(
                nome_instituicao=dados.nome_instituicao.strip(),
                cnpj=cnpj,
                contato=contato,
                endereco=dados.endereco.strip(),
            )

            senha_hash = AuthService.hash_password(dados.senha)
            usuario = self.repository.create_admin_user(
                nome=nome_admin,
                email=email,
                senha_hash=senha_hash,
                instituicao_id=instituicao.id,
            )

            self.db.commit()
            self.db.refresh(instituicao)
            self.db.refresh(usuario)
        except IntegrityError:
            self.db.rollback()
            raise InstitutionRegistrationError("Nao foi possivel concluir o cadastro. Verifique os dados e tente novamente.")
        except InstitutionRegistrationError:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise InstitutionRegistrationError("Erro interno ao cadastrar instituicao.", status_code=500)

        access_token = AuthService.create_access_token(
            data={
                "sub": usuario.email,
                "role": usuario.role,
                "user_id": usuario.id,
                "nome": usuario.nome,
                "instituicao_id": usuario.instituicao_id,
            }
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            usuario=UsuarioResponse.model_validate(usuario),
        )

    def _validate_cnpj(self, cnpj: str) -> None:
        digits = self._only_digits(cnpj)

        if len(digits) != 14:
            raise InstitutionRegistrationError("CNPJ invalido. Informe os 14 digitos do documento.")

        if digits == digits[0] * 14:
            raise InstitutionRegistrationError("CNPJ invalido.")

        if not self._is_valid_cnpj_digits(digits):
            raise InstitutionRegistrationError("CNPJ invalido.")

    def _normalize_contact(self, contato: str) -> str:
        value = contato.strip()
        if len(re.sub(r"\D", "", value)) < 10:
            raise InstitutionRegistrationError("Telefone/WhatsApp invalido.")
        return value

    def _format_cnpj(self, cnpj: str) -> str:
        digits = self._only_digits(cnpj)
        if len(digits) != 14:
            raise InstitutionRegistrationError("CNPJ invalido. Use um CNPJ com 14 digitos.")
        return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"

    @staticmethod
    def _only_digits(value: str) -> str:
        return re.sub(r"\D", "", value or "")

    @staticmethod
    def _is_valid_cnpj_digits(digits: str) -> bool:
        def calc_digit(base: str, weights: list[int]) -> str:
            total = sum(int(digit) * weight for digit, weight in zip(base, weights))
            remainder = total % 11
            return "0" if remainder < 2 else str(11 - remainder)

        first = calc_digit(digits[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
        second = calc_digit(digits[:12] + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
        return digits[-2:] == first + second
