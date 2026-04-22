from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Curso, InscricaoCurso, Usuario, AdminCurso, AdminRoleEnum, StatusCursoEnum, Aula, RoleEnum, VinculoAlunoFaculdade, VinculoStatusEnum
from app.schemas import (
    CursoAdminResponse,
    CursoCreate,
    CursoUpdate,
    CursoResponse,
    CursoDetailResponse,
    InscricaoCursoResponse,
    AulaDetailResponse,
)
from app.routes.auth import get_current_user, get_current_admin, _resolve_request_user
from app.security.tenant import TenantContext, tenant_context
from app.services.admin_course_access import get_allowed_course_ids, ensure_admin_can_access_course

router = APIRouter()


def _normalize_course_price(pago: bool, valor: Decimal | None) -> Decimal | None:
    if not pago:
        return None
    if valor is None or valor <= 0:
        return Decimal("0.0")
    return valor


def _resolve_course_status_for_update(curso: Curso, pago_final: bool) -> StatusCursoEnum:
    if not pago_final:
        return StatusCursoEnum.aprovado
    if not curso.pago or curso.status == StatusCursoEnum.recusado:
        return StatusCursoEnum.pendente
    return curso.status


def _list_public_courses(db: Session) -> list[Curso]:
    return (
        db.query(Curso)
        .filter(Curso.ativo == True, Curso.status == StatusCursoEnum.aprovado)
        .order_by(Curso.data_criacao.desc())
        .all()
    )


@router.get("/", response_model=list[CursoDetailResponse])
def list_cursos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """Lista cursos ativos. Filtra pelo tenant do usuário autenticado."""
    # Alunos sem vínculo ativo com a faculdade ainda não têm acesso liberado
    if current_user.role == RoleEnum.aluno:
        vinculo = db.query(VinculoAlunoFaculdade).filter(
            VinculoAlunoFaculdade.usuario_id == current_user.id,
            VinculoAlunoFaculdade.status == VinculoStatusEnum.ativo,
        ).first()
        if not vinculo:
            return []

    query = db.query(Curso).filter(
        Curso.ativo == True,
        Curso.status == StatusCursoEnum.aprovado,
    )

    # Filtro de tenant
    query = tc.filter_query(query, Curso.faculdade_id)

    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(Curso.id.in_(allowed))

    cursos = query.all()
    return [CursoDetailResponse.model_validate(c) for c in cursos]


@router.get("/catalogo", response_model=list[CursoResponse])
def list_catalogo(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        usuario = _resolve_request_user(request, db)
        query = db.query(Curso).filter(Curso.ativo == True, Curso.status == StatusCursoEnum.aprovado)

        # Filtra pelo tenant do aluno logado
        if usuario is not None and usuario.role == RoleEnum.aluno and usuario.faculdade_id is not None:
            query = query.filter(Curso.faculdade_id == usuario.faculdade_id)

        cursos = query.order_by(Curso.data_criacao.desc()).all()
        print(f"[cursos] list_catalogo retornou {len(cursos)} curso(s)")
        result = []
        for curso in cursos:
            try:
                result.append(CursoResponse.model_validate(curso))
            except Exception as e:
                print(f"\u26a0\ufe0f  Erro ao validar curso ID {curso.id}: {e}")
                continue
        return result
    except Exception as e:
        print(f"\u274c Erro ao listar cat\u00e1logo: {e}")
        return []


@router.get("/admin/all", response_model=list[CursoAdminResponse])
def list_all_courses_for_admin(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    """Lista cursos para o admin. Instrutores veem apenas seus cursos, super admin vê todos."""
    try:
        allowed = get_allowed_course_ids(db, current_user)
        
        if allowed is None:
            # Super admin: retorna todos
            cursos = db.query(Curso).order_by(Curso.data_criacao.desc()).all()
        else:
            # Instrutor: retorna apenas seus cursos
            if not allowed:
                return []
            cursos = db.query(Curso).filter(Curso.id.in_(allowed)).order_by(Curso.data_criacao.desc()).all()
        
        result = []
        for curso in cursos:
            try:
                result.append(CursoAdminResponse.model_validate(curso))
            except Exception as e:
                print(f"⚠️  Erro ao validar curso ID {curso.id}: {e}")
                continue
        return result
    except Exception as e:
        print(f"❌ Erro ao listar cursos do admin: {e}")
        return []

@router.post("/", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
def create_curso(
    curso_data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem criar cursos")

    existing = db.query(Curso).filter(Curso.nome == curso_data.nome).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ja existe um curso com o nome '{curso_data.nome}'",
        )

    valor = _normalize_course_price(curso_data.pago, curso_data.valor)
    initial_status = StatusCursoEnum.aprovado

    db_curso = Curso(
        nome=curso_data.nome,
        descricao=curso_data.descricao,
        pago=curso_data.pago,
        valor=valor,
        status=initial_status,
        percentual_presenca_minima=curso_data.percentual_presenca_minima,
        ativo=True,
        criado_por_id=current_user.id,
    )

    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)

    return CursoResponse.model_validate(db_curso)


@router.get("/{curso_id}", response_model=CursoDetailResponse)
def get_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    tc: TenantContext = Depends(tenant_context),
):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    if not curso.ativo or curso.status != StatusCursoEnum.aprovado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    # Bloqueia acesso cruzado entre tenants
    tc.assert_access(curso.faculdade_id)

    return CursoDetailResponse.model_validate(curso)


@router.put("/{curso_id}", response_model=CursoResponse)
def update_curso(
    curso_id: int,
    curso_data: CursoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem atualizar cursos")
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    ensure_admin_can_access_course(db, current_user, curso_id)

    if curso_data.nome and curso_data.nome != curso.nome:
        existing = db.query(Curso).filter(Curso.nome == curso_data.nome, Curso.id != curso_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ja existe outro curso com o nome '{curso_data.nome}'",
            )

    update_data = curso_data.model_dump(exclude_unset=True)
    pago_final = update_data.get("pago", curso.pago)
    valor_final = update_data.get("valor", curso.valor)
    update_data["valor"] = _normalize_course_price(pago_final, valor_final)
    update_data["status"] = _resolve_course_status_for_update(curso, pago_final)

    for campo, valor in update_data.items():
        setattr(curso, campo, valor)

    db.commit()
    db.refresh(curso)

    return CursoResponse.model_validate(curso)


@router.delete("/{curso_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem deletar cursos")

    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    ensure_admin_can_access_course(db, current_user, curso_id)

    db.delete(curso)
    db.commit()
    return None


@router.post("/{curso_id}/inscrever", response_model=InscricaoCursoResponse, status_code=status.HTTP_201_CREATED)
def inscrever_aluno(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Inscreve o usuário autenticado em um curso."""
    curso = (
        db.query(Curso)
        .filter(
            Curso.id == curso_id,
            Curso.ativo == True,
            Curso.status == StatusCursoEnum.aprovado,
        )
        .first()
    )
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso não encontrado ou indisponível",
        )

    if curso.pago:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este curso é pago e exige aprovação do administrador",
        )

    inscricao = InscricaoCurso(usuario_id=current_user.id, curso_id=curso_id)
    db.add(inscricao)
    try:
        db.commit()
        db.refresh(inscricao)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Você já está inscrito neste curso")

    return InscricaoCursoResponse.model_validate(inscricao)


@router.get("/{curso_id}/alunos")
def list_alunos_curso(
    curso_id: int,
    current_user: Usuario = Depends(get_current_admin),
):
    return {"message": f"Listar alunos do curso {curso_id} - TODO"}


@router.get("/{curso_id}/aulas", response_model=list[AulaDetailResponse])
def list_aulas_do_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Lista as aulas ativas de um curso.

    - Valida se o curso existe (404 se não encontrado).
    - Bloqueia acesso ao curso de outro tenant (403).
    - Super admins vêem aulas de qualquer faculdade.
    """
    # 1. Verificar se o curso existe
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} não encontrado",
        )

    # 2. Bloquear acesso cruzado entre tenants
    tc.assert_access(curso.faculdade_id)

    # 3. Buscar aulas do curso
    aulas = (
        db.query(Aula)
        .filter(Aula.curso_id == curso_id, Aula.ativo == True)
        .order_by(Aula.data_aula)
        .all()
    )
    return [AulaDetailResponse.model_validate(a) for a in aulas]
