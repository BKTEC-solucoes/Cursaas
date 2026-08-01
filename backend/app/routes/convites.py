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
from app.services.admin_course_access import pode_gerenciar_faculdade
from app.services.auth_service import AuthService
from app.services.email_service import enviar_convite
from app.routes.auth import get_current_user
from app.security.tenant import ler_escopo_faculdade

router = APIRouter()

_ROLE_LABELS: dict[str, str] = {
    "super_admin":     "Super Admin",
    "admin_faculdade": "Admin da Faculdade",
    "instrutor":       "Instrutor",
}


def _resolver_faculdade_do_convite(
    request,
    dados: ConviteAdminCreate,
    current_user: Usuario,
    db: Session,
) -> int | None:
    """
    Decide em que faculdade o admin convidado vai nascer.

    Para o super admin a prioridade é ``faculdade_id`` do payload → instituição
    que ele está gerenciando no painel (``X-Faculdade-Id``). Sem nenhuma das duas
    o convite criaria uma conta órfã, que loga mas não enxerga nada — por isso
    admin da faculdade e instrutor exigem faculdade.

    Para os demais cargos de gestão a faculdade é sempre a do próprio convidante:
    tanto o payload quanto o cabeçalho vêm do cliente, e aceitá-los deixaria o
    admin de uma instituição criar administradores em outra.

    Convite de super admin é a exceção: ele administra a plataforma, não uma
    instituição, então nasce global. Sem esta regra o cabeçalho de escopo (que o
    front manda em toda chamada) o prenderia à faculdade aberta no painel.
    """
    if dados.admin_role == AdminRoleEnum.super_admin and dados.faculdade_id is None:
        return None

    if current_user.admin_role != ModelAdminRoleEnum.super_admin:
        if current_user.faculdade_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sua conta não está vinculada a nenhuma instituição",
            )
        if dados.faculdade_id is not None and dados.faculdade_id != current_user.faculdade_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode convidar administradores para a sua instituição",
            )
        faculdade_id: int | None = current_user.faculdade_id
    else:
        faculdade_id = dados.faculdade_id or ler_escopo_faculdade(request)

    if faculdade_id is None:
        # Super admin é global por definição; os outros cargos sem tenant são
        # conta morta.
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


def _exige_gestor(current_user: Usuario) -> None:
    """Convidar administrador é ato de gestão da instituição — instrutor não."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    if not pode_gerenciar_faculdade(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Admin ou Admin da Faculdade podem enviar convites",
        )


def _exige_super_admin(current_user: Usuario) -> None:
    if current_user.admin_role != ModelAdminRoleEnum.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Super Admin pode gerenciar convites de plataforma",
        )


# ── Enviar convite ────────────────────────────────────────────────────────────

@router.post("", response_model=ConviteAdminResponse, status_code=status.HTTP_201_CREATED)
def enviar_convite_admin(
    request: Request,
    dados: ConviteAdminCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _exige_gestor(current_user)

    # Convite de super admin é conta de plataforma: só outro super admin cria.
    if dados.admin_role == AdminRoleEnum.super_admin:
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
    escopo: str | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista convites. ``escopo=sistema`` devolve os convites de super admin (visão
    global do painel de Sistema, só para super admin); o padrão é a visão da
    instituição, que mostra apenas convites de admin da faculdade em gestão.
    """
    _exige_gestor(current_user)

    query = db.query(ConviteAdmin)

    if escopo == "sistema":
        _exige_super_admin(current_user)
        query = query.filter(ConviteAdmin.admin_role == ModelAdminRoleEnum.super_admin)
    else:
        # Convite de super admin é assunto do painel de Sistema — some daqui
        # mesmo em bases antigas, onde ele podia ter nascido com faculdade.
        query = query.filter(ConviteAdmin.admin_role != ModelAdminRoleEnum.super_admin)

        # Gerenciando uma instituição: mostra só os convites dela. Sem escopo, a
        # lista continua global — e isso vale apenas para o super admin, que é
        # quem pode navegar entre instituições.
        if current_user.admin_role == ModelAdminRoleEnum.super_admin:
            faculdade = ler_escopo_faculdade(request)
        else:
            faculdade = current_user.faculdade_id
            if faculdade is None:
                return []
        if faculdade is not None:
            query = query.filter(ConviteAdmin.faculdade_id == faculdade)

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
    _exige_gestor(current_user)
    convite = db.query(ConviteAdmin).filter(ConviteAdmin.id == convite_id).first()
    if not convite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convite não encontrado")

    # Convite de outra instituição — ou de plataforma — não é do admin daqui.
    if current_user.admin_role != ModelAdminRoleEnum.super_admin:
        if (
            convite.admin_role == ModelAdminRoleEnum.super_admin
            or convite.faculdade_id != current_user.faculdade_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este convite não pertence à sua instituição",
            )

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
