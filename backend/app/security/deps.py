"""
Dependencies de autenticação compartilhadas.

Este módulo existe para quebrar um ciclo de import: `security/tenant.py` precisa
de `get_current_user`, mas `routes/auth.py` precisa de `TenantContext`. Com a
função morando aqui — sem importar nada de `routes` — os dois lados dependem
deste módulo e nenhum depende do outro.

`routes/auth.py` reexporta `get_current_user` para não quebrar os imports
existentes espalhados pelas rotas.
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.database import get_db
from app.models import Usuario
from app.services.auth_service import AuthService


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Usuario:
    """
    Dependency para obter o usuário atual a partir do JWT token.
    Usado em endpoints protegidos.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ")[1]

    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Busca pelo ID (não pelo email) para evitar inconsistências.
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sem identificador de usuário",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(Usuario).filter(Usuario.id == user_id).first()

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
