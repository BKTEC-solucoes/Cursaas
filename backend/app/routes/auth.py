from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer
from starlette.requests import Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import timedelta
import os
from pathlib import Path
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioCreateSimples, UsuarioResponse, AdminCreate, AdminUpdate, AdminManageResponse, AdminRoleEnum, AdminListResponse
from app.services.auth_service import AuthService
from app.services.avatar_service import gerar_avatar_iniciais
from app.models import Usuario, RoleEnum, AdminRoleEnum as ModelAdminRoleEnum, AdminCurso, Curso
from app.config import settings
# get_current_user vive em security/deps.py para quebrar o ciclo de import com
# security/tenant.py; reexportado aqui porque as rotas importam daqui.
from app.security.deps import get_current_user
from app.security.tenant import TenantContext, tenant_context, ler_escopo_faculdade

router = APIRouter()
security = HTTPBearer()

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


def get_current_admin(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar este recurso"
        )
    return current_user


def get_current_super_admin(
    current_user: Usuario = Depends(get_current_admin)
) -> Usuario:
    """
    Dependency que exige autenticação como admin com perfil SUPER_ADMIN.
    Usado em endpoints sensíveis: aprovar/recusar instituições, visualizar lista completa.
    """
    from app.models import AdminRoleEnum as ModelAdminRoleEnum
    if current_user.admin_role != ModelAdminRoleEnum.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Admins podem realizar esta operação"
        )
    return current_user


def get_current_faculdade_id(
    current_user: Usuario = Depends(get_current_user),
) -> Optional[int]:
    """
    Retorna o faculdade_id do usuário autenticado.
    Super admins retornam None (acesso a todos os tenants).

    ⚠️  NÃO use este retorno para decidir isolamento de tenant. ``None`` é
    ambíguo: significa tanto "super admin" quanto "usuário sem faculdade
    vinculada" (admin criado por convite, aluno não aprovado, conta legada).
    Confundir os dois dava acesso irrestrito a contas órfãs.
    Para filtros e checagens use ``TenantContext`` (app/security/tenant.py),
    que carrega ``is_super_admin`` separado de ``faculdade_id``.
    """
    from app.models import AdminRoleEnum as ModelAdminRoleEnum
    if current_user.admin_role == ModelAdminRoleEnum.super_admin:
        return None
    return current_user.faculdade_id


def require_tenant(
    faculdade_id: Optional[int] = Depends(get_current_faculdade_id),
) -> int:
    """
    Dependency que garante que o usuário pertence a um tenant específico.
    Rejeita super_admins sem faculdade (use get_current_faculdade_id para eles).
    """
    if faculdade_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação requer vínculo com uma faculdade",
        )
    return faculdade_id

@router.get("/check-email")
def check_email(
    email: str,
    exclude_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Verifica se um e-mail já está registrado. Usado para validação em tempo real."""
    query = db.query(Usuario).filter(
        func.lower(Usuario.email) == email.strip().lower()
    )
    if exclude_id:
        query = query.filter(Usuario.id != exclude_id)
    exists = query.first() is not None
    return {"available": not exists}


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
            "faculdade_id": user.faculdade_id,
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": UsuarioResponse.from_orm(user)
    }

@router.post("/registro", response_model=TokenResponse)
def registro(usuario_data: UsuarioCreateSimples, db: Session = Depends(get_db)):
    """
    Endpoint para registro de novo usuário (aluno).
    Aceita: nome, email, senha, faculdade_id.
    Cria o usuário e uma solicitação de cadastro pendente para o super admin aprovar.
    Retorna um token JWT — o aluno pode fazer login, mas só verá cursos após aprovação.
    """
    from app.models import Faculdade, SolicitacaoCadastro, SolicitacaoStatusEnum

    # Verificar se o email já existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado"
        )

    # Verificar se a faculdade existe e está ativa
    faculdade = db.query(Faculdade).filter(
        Faculdade.id == usuario_data.faculdade_id,
        Faculdade.ativa == True,
    ).first()
    if not faculdade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculdade não encontrada ou inativa",
        )

    # Criar novo usuário com faculdade_id (sem vínculo ativo ainda)
    user = AuthService.create_user(
        db=db,
        email=usuario_data.email,
        nome=usuario_data.nome,
        senha=usuario_data.senha,
        role="aluno",
        faculdade_id=usuario_data.faculdade_id,
    )

    # Criar solicitação de cadastro para o super admin aprovar
    solicitacao = SolicitacaoCadastro(
        nome=user.nome,
        email=user.email,
        faculdade_id=usuario_data.faculdade_id,
        usuario_id=user.id,
        status=SolicitacaoStatusEnum.pendente,
    )
    db.add(solicitacao)
    db.commit()

    # Criar token de acesso
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id, "nome": user.nome, "faculdade_id": user.faculdade_id}
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
    Cria um administrador **da instituição em gestão**.

    Só o primeiro admin da plataforma (banco sem nenhum) nasce por aqui sem
    autenticação e pode ser super admin — o bootstrap. Depois disso a rota fica
    restrita ao painel da instituição: cria instrutor, carimbado com a faculdade
    do cabeçalho ``X-Faculdade-Id``. Contas de super admin passaram para
    ``/api/sistema/super-admins``, que exige um super admin de verdade; antes,
    qualquer admin — inclusive um instrutor — podia se criar um par com acesso
    irrestrito a todos os tenants por este endpoint.
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

        criador_super  = current_user.admin_role == ModelAdminRoleEnum.super_admin
        criador_legado = current_user.admin_role is None
        if not (criador_super or criador_legado):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas Super Admin pode cadastrar administradores",
            )

        if usuario_data.admin_role == AdminRoleEnum.super_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Contas de super admin são criadas no painel de Sistema "
                    "(POST /api/sistema/super-admins), fora do escopo de uma instituição"
                ),
            )

    # Verificar se o email já existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado"
        )
    
    # Faculdade do novo admin: quem tem vínculo próprio cria dentro dele; o
    # super admin cria dentro da instituição que está gerenciando no painel
    # (cabeçalho X-Faculdade-Id). Sem isso o admin nascia órfão — sem
    # faculdade_id ele não aparece em nenhuma listagem filtrada por tenant.
    faculdade_do_novo_admin: Optional[int] = None
    if current_user is not None:
        if current_user.admin_role == ModelAdminRoleEnum.super_admin:
            faculdade_do_novo_admin = ler_escopo_faculdade(request)
        else:
            faculdade_do_novo_admin = current_user.faculdade_id

    # Criar novo usuário
    user = AuthService.create_user(
        db=db,
        email=usuario_data.email,
        nome=usuario_data.nome,
        senha=usuario_data.senha,
        role="admin",
        admin_role=usuario_data.admin_role,
        faculdade_id=faculdade_do_novo_admin,
        foto_perfil=usuario_data.foto_perfil,
        telefone=usuario_data.telefone,
        sexo=usuario_data.sexo,
        data_nascimento=usuario_data.data_nascimento,
        cpf_rg=usuario_data.cpf_rg,
        cep=usuario_data.cep,
        endereco=usuario_data.endereco,
    )

    # Política de acesso por role:
    # - super_admin → irrestrito (não precisa de registros em admin_cursos)
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


@router.get("/admins", response_model=AdminListResponse)
def listar_admins(
    busca: Optional[str] = None,
    admin_role: Optional[str] = None,
    ativo: Optional[bool] = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """Lista administradores com filtros, busca e paginação."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )

    # Sem o filtro de tenant esta rota devolvia todos os admins de todas as
    # faculdades, com telefone, CPF e endereço.
    query = db.query(Usuario).filter(Usuario.role == RoleEnum.admin)
    query = tc.filter_query(query, Usuario.faculdade_id)

    if busca:
        termo = f"%{busca.strip().lower()}%"
        query = query.filter(
            (func.lower(Usuario.nome).like(termo)) |
            (func.lower(Usuario.email).like(termo))
        )

    if admin_role is not None:
        if admin_role == "legacy":
            query = query.filter(Usuario.admin_role.is_(None))
        else:
            try:
                role_enum = ModelAdminRoleEnum(admin_role)
                query = query.filter(Usuario.admin_role == role_enum)
            except ValueError:
                pass

    if ativo is not None:
        query = query.filter(Usuario.ativo == ativo)

    total = query.count()

    if page_size < 1:
        page_size = 10
    if page_size > 100:
        page_size = 100
    if page < 1:
        page = 1

    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    admins = (
        query.order_by(Usuario.nome.asc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    admin_ids = [a.id for a in admins]
    vinculos = (
        db.query(AdminCurso.admin_id, AdminCurso.curso_id)
        .filter(AdminCurso.admin_id.in_(admin_ids))
        .all()
    ) if admin_ids else []

    cursos_por_admin: dict[int, list[int]] = {}
    for admin_id, curso_id in vinculos:
        cursos_por_admin.setdefault(admin_id, []).append(curso_id)

    items = [
        AdminManageResponse(
            id=a.id,
            nome=a.nome,
            email=a.email,
            admin_role=a.admin_role,
            foto_perfil=a.foto_perfil,
            ativo=a.ativo,
            curso_ids=cursos_por_admin.get(a.id, []),
            telefone=a.telefone,
            sexo=a.sexo,
            data_nascimento=a.data_nascimento,
            cpf_rg=a.cpf_rg,
            cep=a.cep,
            endereco=a.endereco,
        )
        for a in admins
    ]

    return AdminListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


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

    # Isolamento entre tenants: um admin só edita admins da própria faculdade.
    if not is_super_admin and admin.faculdade_id != current_user.faculdade_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: administrador pertence a outra faculdade",
        )

    # Mudança de privilégio é restrita — e nunca sobre si mesmo.
    #
    # Antes, qualquer admin legado (admin_role NULL) podia se promover a
    # super_admin com um PUT no próprio id. Duas travas:
    #   1. só super_admin altera admin_role;
    #   2. ninguém altera o próprio admin_role, nem super_admin.
    if dados.admin_role is not None and dados.admin_role != admin.admin_role:
        if not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas Super Admin pode alterar o perfil de um administrador",
            )
        if admin.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode alterar o seu próprio perfil de administrador",
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
    if dados.telefone is not None:
        admin.telefone = dados.telefone
    if dados.sexo is not None:
        admin.sexo = dados.sexo
    if dados.data_nascimento is not None:
        admin.data_nascimento = dados.data_nascimento
    if dados.cpf_rg is not None:
        admin.cpf_rg = dados.cpf_rg
    if dados.cep is not None:
        admin.cep = dados.cep
    if dados.endereco is not None:
        admin.endereco = dados.endereco

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


@router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_super_admin),
):
    """
    Remove permanentemente um administrador.
    Apenas Super Admin pode executar. Não é possível excluir a si mesmo.
    """
    if current_user.id == admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta"
        )

    admin = db.query(Usuario).filter(Usuario.id == admin_id, Usuario.role == RoleEnum.admin).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Administrador não encontrado"
        )

    db.query(AdminCurso).filter(AdminCurso.admin_id == admin_id).delete()
    db.delete(admin)
    db.commit()


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


@router.get("/check-email/{email}")
def check_email(email: str, db: Session = Depends(get_db)):
    """
    Endpoint para validar se um email já está registrado.
    Retorna: {"disponivel": true/false}
    """
    existing_user = db.query(Usuario).filter(Usuario.email == email.lower()).first()
    return {
        "disponivel": existing_user is None,
        "email": email
    }

