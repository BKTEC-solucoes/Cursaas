from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models import Usuario, RoleEnum, AdminRoleEnum
from app.config import settings

# Contexto para criptografia de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Criptografa a senha"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica se a senha corresponde ao hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Cria um token JWT"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decodifica um token JWT"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            email: str = payload.get("sub")
            role: str = payload.get("role")
            
            if email is None:
                return None
            
            return {"email": email, "role": role}
        except JWTError:
            return None
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[Usuario]:
        """Autentica um usuário pelo email e senha"""
        user = db.query(Usuario).filter(Usuario.email == email).first()
        
        if not user:
            return None
        
        if not AuthService.verify_password(password, user.senha):
            return None
        
        if not user.ativo:
            return None
        
        return user
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        nome: str,
        senha: str,
        role: str = "aluno",
        admin_role: Optional[str] = None,
        foto_perfil: Optional[str] = None,
        data_nascimento=None,
        sexo: str = None,
        cpf_rg: str = None,
        endereco: str = None,
        cep: str = None,
        telefone: str = None,
        nome_responsavel: str = None,
        numero_matricula: str = None,
        turma: str = None,
        historico_escolar: str = None,
    ) -> Usuario:
        """Cria um novo usuário"""
        hashed_password = AuthService.hash_password(senha)
        
        # Converter role string para RoleEnum
        if isinstance(role, str):
            role = RoleEnum(role)

        # Converter admin_role string para AdminRoleEnum
        parsed_admin_role = None
        if admin_role is not None:
            if isinstance(admin_role, AdminRoleEnum):
                parsed_admin_role = admin_role
            else:
                parsed_admin_role = AdminRoleEnum(admin_role)
        
        db_user = Usuario(
            email=email,
            nome=nome,
            senha=hashed_password,
            role=role,
            admin_role=parsed_admin_role,
            foto_perfil=foto_perfil,
            ativo=True,
            data_nascimento=data_nascimento,
            sexo=sexo,
            cpf_rg=cpf_rg,
            endereco=endereco,
            cep=cep,
            telefone=telefone,
            nome_responsavel=nome_responsavel,
            numero_matricula=numero_matricula,
            turma=turma,
            historico_escolar=historico_escolar,
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
