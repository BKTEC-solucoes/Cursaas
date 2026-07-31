"""
Endpoints para o sistema de convite de administradores.

POST  /api/convites          → Super admin envia convite por e-mail
GET   /api/convites          → Lista convites emitidos
GET   /api/convites/validar  → Valida token (página do frontend)
POST  /api/convites/aceitar  → Usuário define nome+senha e cria conta
DELETE /api/convites/{id}    → Revoga convite não usado
"""
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Usuario, RoleEnum, AdminRoleEnum as ModelAdminRoleEnum, ConviteAdmin, Faculdade
from app.schemas import (
    ConviteAdminCreate,
    ConviteAdminResponse,
    AceitarConviteRequest,
    UsuarioResponse,
    AdminRoleEnum,
)
from app.services.auth_service import AuthService
from app.services.email_service import enviar_convite
from app.routes.auth import get_current_user
from app.security.tenant import ler_escopo_faculdade

router = APIRouter()

_ROLE_LABELS: dict[str, str] = {
    "super_admin": "Super Admin",
    "instrutor":   "Instrutor",
}


def _resolver_faculdade_do_convite(
    request,
    dados: ConviteAdminCreate,
    current_user: Usuario,
    db: Session,
) -> int | None:
    """
    Decide em que faculdade o admin convidado vai nascer.

    Prioridade: ``faculdade_id`` do payload → instituição que o super admin está
    gerenciando no painel (``X-Faculdade-Id``) → vínculo do próprio convidante
    (caso do admin legado). Sem nenhuma das três o convite cria uma conta órfã,
    que loga mas não enxerga nada — por isso o instrutor exige faculdade.
    """
    faculdade_id = dados.faculdade_id or ler_escopo_faculdade(request) or current_user.faculdade_id

    if faculdade_id is None:
        # Super admin é global por definição; instrutor sem tenant é conta morta.
        if dados.admin_role == AdminRoleEnum.super_admin:
            return None
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione a instituição do convidado antes de enviar o convite",
        )

    existe = (
        db.query(Faculdade.id)
        .filter(Faculdade.id == faculdade_id, Faculdade.ativa == True)
        .first()
    )
    if not existe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculdade não encontrada ou inativa",
        )
    return faculdade_id


def _exige_super_admin(current_user: Usuario) -> None:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    is_super = current_user.admin_role == ModelAdminRoleEnum.super_admin
    is_legacy = current_user.admin_role is None
    if not (is_super or is_legacy):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Admin pode enviar convites",
        )


# ── Enviar convite ────────────────────────────────────────────────────────────

@router.post("", response_model=ConviteAdminResponse, status_code=status.HTTP_201_CREATED)
def enviar_convite_admin(
    request: Request,
    dados: ConviteAdminCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _exige_super_admin(current_user)

    faculdade_id = _resolver_faculdade_do_convite(request, dados, current_user, db)

    email_lower = dados.email.strip().lower()

    # E-mail já tem conta ativa?
    if db.query(Usuario).filter(Usuario.email == email_lower).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já possui uma conta cadastrada",
        )

    # Já tem convite pendente (não usado e não expirado)?
    convite_pendente = (
        db.query(ConviteAdmin)
        .filter(
            ConviteAdmin.email == email_lower,
            ConviteAdmin.usado == False,
            ConviteAdmin.data_expiracao > datetime.utcnow(),
        )
        .first()
    )
    if convite_pendente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um convite ativo para este e-mail",
        )

    token = secrets.token_urlsafe(48)
    expiracao = datetime.utcnow() + timedelta(hours=settings.INVITE_EXPIRE_HOURS)

    convite = ConviteAdmin(
        token=token,
        email=email_lower,
        admin_role=ModelAdminRoleEnum(dados.admin_role.value),
        faculdade_id=faculdade_id,
        convidado_por_id=current_user.id,
        usado=False,
        data_criacao=datetime.utcnow(),
        data_expiracao=expiracao,
    )
    db.add(convite)
    db.commit()
    db.refresh(convite)

    link = f"{settings.FRONTEND_URL}/auth/convite?token={token}"
    role_label = _ROLE_LABELS.get(dados.admin_role.value, dados.admin_role.value)
    enviado = enviar_convite(
        destinatario=email_lower,
        nome_convidante=current_user.nome,
        link=link,
        role_label=role_label,
        horas=settings.INVITE_EXPIRE_HOURS,
    )

    if not enviado:
        # Rollback — mantém consistência caso envio falhe com SMTP real
        db.delete(convite)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Convite criado, mas houve falha no envio do e-mail. Tente novamente.",
        )

    return _to_response(convite, db)


# ── Listar convites ───────────────────────────────────────────────────────────

@router.get("", response_model=list[ConviteAdminResponse])
def listar_convites(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _exige_super_admin(current_user)

    query = db.query(ConviteAdmin)

    # Gerenciando uma instituição: mostra só os convites dela. Sem escopo, a
    # lista continua global (visão do super admin).
    escopo = ler_escopo_faculdade(request) or current_user.faculdade_id
    if escopo is not None:
        query = query.filter(ConviteAdmin.faculdade_id == escopo)

    convites = (
        query
        .order_by(ConviteAdmin.data_criacao.desc())
        .limit(200)
        .all()
    )
    return [_to_response(c, db) for c in convites]


# ── Validar token (GET público) ───────────────────────────────────────────────

@router.get("/validar")
def validar_token(token: str, db: Session = Depends(get_db)):
    convite = _buscar_convite_valido(token, db)
    return {
        "email": convite.email,
        "admin_role": convite.admin_role.value,
        "role_label": _ROLE_LABELS.get(convite.admin_role.value, convite.admin_role.value),
    }


# ── Aceitar convite ───────────────────────────────────────────────────────────

@router.post("/aceitar", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def aceitar_convite(dados: AceitarConviteRequest, db: Session = Depends(get_db)):
    convite = _buscar_convite_valido(dados.token, db)

    # Dupla verificação — e-mail pode ter sido cadastrado após o envio
    if db.query(Usuario).filter(Usuario.email == convite.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este e-mail já possui uma conta cadastrada",
        )

    user = AuthService.create_user(
        db=db,
        email=convite.email,
        nome=dados.nome.strip(),
        senha=dados.senha,
        role="admin",
        admin_role=convite.admin_role,
        # Sem o vínculo a conta nasce órfã: loga, mas toda listagem volta vazia
        # e toda escrita responde 403.
        faculdade_id=convite.faculdade_id,
    )

    # Marcar como usado — invalidação imediata (sem reutilização)
    convite.usado = True
    convite.data_uso = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return UsuarioResponse.from_orm(user)


# ── Revogar convite ───────────────────────────────────────────────────────────

@router.delete("/{convite_id}", status_code=status.HTTP_204_NO_CONTENT)
def revogar_convite(
    convite_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _exige_super_admin(current_user)
    convite = db.query(ConviteAdmin).filter(ConviteAdmin.id == convite_id).first()
    if not convite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite não encontrado")
    if convite.usado:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Convite já foi utilizado")
    db.delete(convite)
    db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _buscar_convite_valido(token: str, db: Session) -> ConviteAdmin:
    convite = db.query(ConviteAdmin).filter(ConviteAdmin.token == token).first()
    if not convite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite não encontrado")
    if convite.usado:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Este convite já foi utilizado")
    if convite.data_expiracao < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Este convite expirou")
    return convite


def _to_response(convite: ConviteAdmin, db: Session) -> ConviteAdminResponse:
    nome_convidante = None
    if convite.convidado_por_id:
        u = db.query(Usuario).filter(Usuario.id == convite.convidado_por_id).first()
        nome_convidante = u.nome if u else None
    return ConviteAdminResponse(
        id=convite.id,
        email=convite.email,
        admin_role=AdminRoleEnum(convite.admin_role.value),
        faculdade_id=convite.faculdade_id,
        faculdade_nome=convite.faculdade.nome if convite.faculdade else None,
        usado=convite.usado,
        data_criacao=convite.data_criacao,
        data_expiracao=convite.data_expiracao,
        data_uso=convite.data_uso,
        convidado_por_nome=nome_convidante,
    )
