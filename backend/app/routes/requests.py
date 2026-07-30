from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CourseRequest, Curso, InscricaoCurso, StatusCursoEnum, StatusSolicitacaoEnum, Usuario
from app.routes.auth import get_current_user
from app.schemas import CourseRequestCreate, CourseRequestResponse, CourseRequestUpdate
from app.security.tenant import TenantContext, tenant_context

router = APIRouter()


def _serialize_request(request: CourseRequest) -> CourseRequestResponse:
    return CourseRequestResponse(
        id=request.id,
        usuario_id=request.usuario_id,
        curso_id=request.curso_id,
        status=request.status.value if hasattr(request.status, "value") else request.status,
        created_at=request.created_at,
        updated_at=request.updated_at,
        usuario_nome=request.usuario.nome if request.usuario else None,
        usuario_email=request.usuario.email if request.usuario else None,
        curso_nome=request.curso.nome if request.curso else None,
        curso_pago=request.curso.pago if request.curso else None,
    )


@router.post("/", response_model=CourseRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: CourseRequestCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    curso = (
        db.query(Curso)
        .filter(
            Curso.id == payload.curso_id,
            Curso.ativo == True,
            Curso.status == StatusCursoEnum.aprovado,
        )
        .first()
    )
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso nao encontrado ou indisponivel",
        )

    if not curso.pago:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este curso nao exige solicitacao de acesso",
        )

    inscricao = db.query(InscricaoCurso).filter(
        InscricaoCurso.usuario_id == current_user.id,
        InscricaoCurso.curso_id == payload.curso_id,
    ).first()
    if inscricao:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voce ja possui acesso a este curso",
        )

    existing = db.query(CourseRequest).filter(
        CourseRequest.usuario_id == current_user.id,
        CourseRequest.curso_id == payload.curso_id,
    ).first()
    if existing:
        if existing.status == StatusSolicitacaoEnum.rejected:
            existing.status = StatusSolicitacaoEnum.pending
            db.commit()
            db.refresh(existing)
            return _serialize_request(existing)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ja existe uma solicitacao para este curso",
        )

    course_request = CourseRequest(
        usuario_id=current_user.id,
        curso_id=payload.curso_id,
        status=StatusSolicitacaoEnum.pending,
    )
    db.add(course_request)
    try:
        db.commit()
        db.refresh(course_request)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ja existe uma solicitacao para este curso",
        )

    return _serialize_request(course_request)


@router.get("/", response_model=list[CourseRequestResponse])
def list_requests(
    status_filter: StatusSolicitacaoEnum | None = Query(default=StatusSolicitacaoEnum.pending, alias="status"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas admin pode listar solicitacoes")

    # CourseRequest não tem faculdade_id: o tenant vem do curso solicitado.
    query = (
        db.query(CourseRequest)
        .join(Curso, CourseRequest.curso_id == Curso.id)
        .order_by(CourseRequest.created_at.desc())
    )
    query = tc.filter_query(query, Curso.faculdade_id)
    if status_filter is not None:
        query = query.filter(CourseRequest.status == status_filter)

    return [_serialize_request(item) for item in query.all()]


@router.get("/me/{curso_id}", response_model=CourseRequestResponse | None)
def get_my_request_for_course(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    request = db.query(CourseRequest).filter(
        CourseRequest.usuario_id == current_user.id,
        CourseRequest.curso_id == curso_id,
    ).first()
    if not request:
        return None
    return _serialize_request(request)


@router.patch("/{request_id}", response_model=CourseRequestResponse)
def update_request_status(
    request_id: int,
    payload: CourseRequestUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role.value != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas admin pode atualizar solicitacoes")

    course_request = db.query(CourseRequest).filter(CourseRequest.id == request_id).first()
    if not course_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitacao nao encontrada")

    # Aprovar matricula o aluno no curso: sem esta checagem, um admin de outra
    # faculdade concedia acesso a um curso que não é dele.
    curso = db.query(Curso).filter(Curso.id == course_request.curso_id).first()
    tc.assert_access(curso.faculdade_id if curso else None)

    course_request.status = StatusSolicitacaoEnum(payload.status)

    if course_request.status == StatusSolicitacaoEnum.approved:
        inscricao = db.query(InscricaoCurso).filter(
            InscricaoCurso.usuario_id == course_request.usuario_id,
            InscricaoCurso.curso_id == course_request.curso_id,
        ).first()
        if not inscricao:
            db.add(InscricaoCurso(usuario_id=course_request.usuario_id, curso_id=course_request.curso_id))

    db.commit()
    db.refresh(course_request)

    return _serialize_request(course_request)
