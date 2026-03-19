from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer
from starlette.requests import Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import timedelta
import os
from pathlib import Path
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse, AdminCreate, AdminUpdate, AdminManageResponse, AdminRoleEnum
from app.services.auth_service import AuthService
from app.services.avatar_service import gerar_avatar_iniciais
from app.models import Usuario, RoleEnum, AdminRoleEnum as ModelAdminRoleEnum, AdminCurso, Curso
from app.config import settings

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


def _resolve_request_user(request: Request, db: Session) -> Optional[Usuario]:
    """Resolve usuário a partir do token do header Authorization, se existir."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
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
        data={
            "sub": user.email,
            "role": user.role,
            "admin_role": user.admin_role.value if user.admin_role else None,
            "user_id": user.id,
            "nome": user.nome,
        }
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

@router.post("/admin-registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def admin_registro(
    request: Request,
    usuario_data: AdminCreate,
    db: Session = Depends(get_db)
):
    """
    Endpoint para criar novo usuário admin.
    Se já existir admin no sistema, requer autenticação de admin.
    """
    existe_admin = db.query(Usuario).filter(Usuario.role == RoleEnum.admin).first() is not None
    current_user = _resolve_request_user(request, db)

    if existe_admin:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token não fornecido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if current_user.role != RoleEnum.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a administradores"
            )
    
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
        role="admin",
        admin_role=usuario_data.admin_role,
        foto_perfil=usuario_data.foto_perfil,
    )

    # Política de acesso por role:
    # - super_admin → irrestrito (não precisa de registros em admin_cursos)
    # - financeiro / suporte → sem acesso a nenhum curso (nenhum registro)
    # - instrutor → sem cursos inicialmente; acesso auto-concedido ao criar cursos
    # - Cursos manuais via curso_ids só são aplicados se a role não for super_admin
    role_criada = user.admin_role
    nao_restrito = (role_criada is None or role_criada == ModelAdminRoleEnum.super_admin)

    if not nao_restrito and usuario_data.curso_ids:
        cursos_existentes = (
            db.query(Curso.id)
            .filter(Curso.id.in_(usuario_data.curso_ids), Curso.ativo == True)
            .all()
        )
        ids_validos = {cid for (cid,) in cursos_existentes}

        for curso_id in set(usuario_data.curso_ids):
            if curso_id in ids_validos:
                db.add(AdminCurso(admin_id=user.id, curso_id=curso_id))
        db.commit()

    return UsuarioResponse.from_orm(user)


@router.get("/admins", response_model=list[AdminManageResponse])
def listar_admins(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista todos os usuários administradores (acesso apenas admin)."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )

    admins = (
        db.query(Usuario)
        .filter(Usuario.role == RoleEnum.admin)
        .order_by(Usuario.nome.asc())
        .all()
    )

    admin_ids = [a.id for a in admins]
    vinculos = db.query(AdminCurso.admin_id, AdminCurso.curso_id).filter(AdminCurso.admin_id.in_(admin_ids)).all()

    cursos_por_admin: dict[int, list[int]] = {}
    for admin_id, curso_id in vinculos:
        cursos_por_admin.setdefault(admin_id, []).append(curso_id)

    return [
        AdminManageResponse(
            id=a.id,
            nome=a.nome,
            email=a.email,
            admin_role=a.admin_role,
            foto_perfil=a.foto_perfil,
            curso_ids=cursos_por_admin.get(a.id, []),
        )
        for a in admins
    ]


@router.put("/admins/{admin_id}", response_model=UsuarioResponse)
def editar_admin(
    admin_id: int,
    dados: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Edita dados de um administrador.
    Apenas Super Admin ou Admin Legado (admin_role == None) podem editar.
    """
    # Verificar permissão: apenas super_admin ou admin legado
    if current_user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )
    
    is_super_admin = current_user.admin_role == ModelAdminRoleEnum.super_admin
    is_legacy_admin = current_user.admin_role is None
    
    if not (is_super_admin or is_legacy_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Admin e Admin Legado podem editar administradores"
        )
    
    # Buscar admin a editar
    admin = db.query(Usuario).filter(Usuario.id == admin_id, Usuario.role == RoleEnum.admin).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador não encontrado"
        )
    
    # Validar que nenhum outro admin tem o novo email
    if dados.email and dados.email.lower() != admin.email.lower():
        existing = db.query(Usuario).filter(
            Usuario.email == dados.email,
            Usuario.id != admin_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já registrado"
            )
    
    # Atualizar campos
    if dados.nome:
        admin.nome = dados.nome
    if dados.email:
        admin.email = dados.email
    if dados.admin_role is not None:
        admin.admin_role = dados.admin_role
    if dados.foto_perfil is not None:
        admin.foto_perfil = dados.foto_perfil

    # Atualizar vínculos de cursos (quando enviado)
    if dados.curso_ids is not None:
        db.query(AdminCurso).filter(AdminCurso.admin_id == admin.id).delete()

        if dados.curso_ids:
            cursos_existentes = (
                db.query(Curso.id)
                .filter(Curso.id.in_(dados.curso_ids), Curso.ativo == True)
                .all()
            )
            ids_validos = {cid for (cid,) in cursos_existentes}

            for curso_id in set(dados.curso_ids):
                if curso_id in ids_validos:
                    db.add(AdminCurso(admin_id=admin.id, curso_id=curso_id))
    
    db.commit()
    db.refresh(admin)
    
    return UsuarioResponse.from_orm(admin)


@router.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Faz upload de foto de perfil.
    Aceita JPG, PNG. Retorna o caminho relativo do arquivo salvo.
    """
    # Validar tipo de arquivo
    allowed_types = ["image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas JPG e PNG são aceitos"
        )
    
    # Criar diretório se não existir
    upload_dir = Path(settings.UPLOAD_DIR) / "profile_pictures"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Gerar nome único para o arquivo
    import uuid
    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = upload_dir / filename
    
    # Salvar arquivo
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Retornar caminho relativo para o frontend
    relative_path = f"uploads/profile_pictures/{filename}"
    
    return {
        "filename": filename,
        "path": relative_path,
        "content_type": file.content_type
    }


@router.post("/generate-avatar")
def generate_avatar(nome: str):
    """
    Gera um avatar SVG com as iniciais do nome.
    Retorna o SVG em base64.
    """
    svg = gerar_avatar_iniciais(nome)
    
    import base64
    svg_bytes = svg.encode("utf-8")
    svg_b64 = base64.b64encode(svg_bytes).decode("utf-8")
    
    return {
        "avatar": f"data:image/svg+xml;base64,{svg_b64}",
        "nome": nome
    }

