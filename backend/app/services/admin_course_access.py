import logging
from typing import Optional, Set

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Usuario, RoleEnum, AdminRoleEnum, AdminCurso

logger = logging.getLogger(__name__)


def is_super_or_legacy_admin(user: Usuario) -> bool:
    if user.role != RoleEnum.admin:
        return False
    return user.admin_role is None or user.admin_role == AdminRoleEnum.super_admin


def pode_gerenciar_faculdade(user: Usuario) -> bool:
    """
    True para quem administra a instituição inteira: super admin, admin da
    faculdade e o admin legado (``admin_role`` NULL, anterior à coluna).

    É a fronteira entre "gerencia a faculdade" e "produz conteúdo": o instrutor
    fica de fora — ele cria curso, aula e prova, mas não mexe em alunos,
    administradores, tema nem solicitações de cadastro. O recorte de tenant
    continua sendo do ``TenantContext``; esta função só responde "qual cargo".
    """
    if user.role != RoleEnum.admin:
        return False
    return user.admin_role in (None, AdminRoleEnum.super_admin, AdminRoleEnum.admin_faculdade)


def _tenant_aprovado(db: Session, user: Usuario) -> bool:
    """True se a faculdade (ou a instituição legada) do usuário está aprovada."""
    from app.models import Faculdade, Instituicao

    if user.faculdade_id:
        faculdade = db.query(Faculdade).filter(Faculdade.id == user.faculdade_id).first()
        if faculdade and not faculdade.aprovada:
            return False

    if user.instituicao_id:
        inst = db.query(Instituicao).filter(Instituicao.id == user.instituicao_id).first()
        if inst and not inst.aprovada:
            return False

    return True


def get_allowed_course_ids(db: Session, user: Usuario) -> Optional[Set[int]]:
    """
    Retorna os IDs de curso que o admin pode gerenciar. `None` = sem restrição.

    Esta função responde "QUAIS cursos", não "de qual faculdade" — o recorte de
    tenant é do TenantContext, e as rotas aplicam os dois. Aqui só entra a
    restrição por autoria/vínculo dentro do tenant.

        super_admin ........ None (sem restrição; o tenant já filtra)
        admin_faculdade .... None (idem — gerencia todos os cursos da faculdade)
        legado (NULL) ...... None (idem)
        instrutor .......... cursos que criou + cursos vinculados em admin_cursos
        demais ............. set() (nenhum)

    A versão anterior decidia por `instituicao_id`, coluna legada anterior ao
    multi-tenant. Instrutor da era `faculdade_id` (com instituicao_id NULL) caía
    no ramo final e não enxergava curso NENHUM.
    """
    if user.role != RoleEnum.admin:
        return None

    if is_super_or_legacy_admin(user):
        return None

    # Faculdade pendente de aprovação bloqueia todo o acesso a cursos.
    # `Faculdade.aprovada` é o equivalente multi-tenant de `Instituicao.aprovada`;
    # a instituição legada continua valendo para contas anteriores à migração.
    if not _tenant_aprovado(db, user):
        return set()

    # Admin da faculdade enxerga todo o catálogo do próprio tenant — a restrição
    # por autoria é só do instrutor. O filtro por `faculdade_id` continua sendo
    # aplicado pelo TenantContext na rota.
    if user.admin_role == AdminRoleEnum.admin_faculdade:
        return None

    if user.admin_role == AdminRoleEnum.instrutor:
        from app.models import Curso

        criados = {
            cid for (cid,) in db.query(Curso.id).filter(Curso.criado_por_id == user.id).all()
        }
        vinculados = {
            cid for (cid,) in db.query(AdminCurso.curso_id).filter(AdminCurso.admin_id == user.id).all()
        }
        return criados | vinculados

    logger.warning(
        "admin_role não reconhecido para user_id=%s (%r): negando acesso a cursos",
        user.id,
        user.admin_role,
    )
    return set()


def ensure_admin_can_access_course(db: Session, user: Usuario, curso_id: int) -> None:
    """Valida se o admin pode gerenciar o curso informado."""
    if user.role != RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores"
        )

    allowed = get_allowed_course_ids(db, user)
    if allowed is not None and curso_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não possui permissão para este curso"
        )
