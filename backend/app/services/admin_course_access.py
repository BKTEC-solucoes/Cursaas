from typing import Optional, Set
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Usuario, RoleEnum, AdminRoleEnum, AdminCurso


def is_super_or_legacy_admin(user: Usuario) -> bool:
    if user.role != RoleEnum.admin:
        return False
    return user.admin_role is None or user.admin_role == AdminRoleEnum.super_admin


def get_allowed_course_ids(db: Session, user: Usuario) -> Optional[Set[int]]:
    """Retorna IDs permitidos para o admin. None significa sem restrição.
    
    - Super Admin (global): acesso a todos os cursos (None = sem restrição)
    - Instrutor aprovado: acesso apenas aos cursos que criou
    - Instrutor pendente (instituição não aprovada): acesso bloqueado (conjunto vazio)
    - Legado (sem instituição): acesso a todos (None = sem restrição)
    """
    if user.role != RoleEnum.admin:
        return None

    print(f"[DEBUG] User {user.id} ({user.email}): instituicao_id={user.instituicao_id}, admin_role={user.admin_role}")

    # Se tem instituição, verificar se foi aprovada
    if user.instituicao_id:
        from app.models import Instituicao, Curso
        inst = db.query(Instituicao).filter(Instituicao.id == user.instituicao_id).first()
        print(f"[DEBUG] Instituição {user.instituicao_id}: aprovada={inst.aprovada if inst else 'NOT FOUND'}")
        
        # Se instituição não foi aprovada, bloqueia acesso total
        if inst and not inst.aprovada:
            print(f"[DEBUG] Bloqueando acesso - instituição não aprovada")
            return set()  # conjunto vazio = acesso negado a todos os cursos
        
        # Se instituição foi aprovada e é instrutor, retorna apenas seus cursos
        if user.admin_role == AdminRoleEnum.instrutor:
            ids = db.query(Curso.id).filter(Curso.criado_por_id == user.id).all()
            result = {cid for (cid,) in ids}
            print(f"[DEBUG] Instrutor aprovado - cursos criados: {result}")
            return result
        
        # Super admin (com instituição): sem restrição
        if user.admin_role == AdminRoleEnum.super_admin:
            print(f"[DEBUG] Super admin com instituição - sem restrição")
            return None
    
    # Super admin ou legado (sem instituição): sem restrição
    if is_super_or_legacy_admin(user):
        print(f"[DEBUG] Super admin/legado - sem restrição")
        return None
    
    # Outros casos: sem acesso
    print(f"[DEBUG] Bloqueando acesso - admin_role não reconhecido: {user.admin_role}")
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
