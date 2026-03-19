from typing import Optional, Set
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Usuario, RoleEnum, AdminRoleEnum, AdminCurso


def is_super_or_legacy_admin(user: Usuario) -> bool:
    if user.role != RoleEnum.admin:
        return False
    return user.admin_role is None or user.admin_role == AdminRoleEnum.super_admin


def get_allowed_course_ids(db: Session, user: Usuario) -> Optional[Set[int]]:
    """Retorna IDs permitidos para o admin. None significa sem restrição."""
    if user.role != RoleEnum.admin:
        return None

    if is_super_or_legacy_admin(user):
        return None

    ids = db.query(AdminCurso.curso_id).filter(AdminCurso.admin_id == user.id).all()
    return {cid for (cid,) in ids}


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
