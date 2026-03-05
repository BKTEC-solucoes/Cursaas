from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.requests import Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.services.auth_service import AuthService
from app.models import Usuario

router = APIRouter()
security = HTTPBearer()

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Dependency para obter o usuário atual a partir do JWT token.
    Usado em endpoints protegidos.
    """
    # Extrair token do header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    
    # Decodificar token
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Buscar usuário no banco
    email = payload.get("email")
    user = db.query(Usuario).filter(Usuario.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário desativado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint para login do usuário.
    Retorna um token JWT e informações do usuário.
    """
    user = AuthService.authenticate_user(db, credentials.email, credentials.senha)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Criar token de acesso
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id, "nome": user.nome}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": UsuarioResponse.from_orm(user)
    }

@router.post("/registro", response_model=TokenResponse)
def registro(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Endpoint para registro de novo usuário (aluno).
    Retorna um token JWT e informações do usuário criado.
    """
    # Verificar se o email já existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado"
        )
    
    # Criar novo usuário
    user = AuthService.create_user(
        db=db,
        email=usuario_data.email,
        nome=usuario_data.nome,
        senha=usuario_data.senha,
        role="aluno"
    )
    
    # Criar token de acesso
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id, "nome": user.nome}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": UsuarioResponse.from_orm(user)
    }

@router.post("/admin-registro", response_model=TokenResponse)
def admin_registro(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Endpoint para criar novo usuário admin (requer autenticação admin).
    Retorna um token JWT e informações do usuário criado.
    """
    # TODO: Implementar verificação de permissão admin
    
    # Verificar se o email já existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado"
        )
    
    # Criar novo usuário
    user = AuthService.create_user(
        db=db,
        email=usuario_data.email,
        nome=usuario_data.nome,
        senha=usuario_data.senha,
        role="admin"
    )
    
    # Criar token de acesso
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id, "nome": user.nome}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": UsuarioResponse.from_orm(user)
    }
