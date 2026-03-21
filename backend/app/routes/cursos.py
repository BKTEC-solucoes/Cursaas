from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Curso, InscricaoCurso, StatusCursoEnum, Usuario
from app.routes.auth import get_current_admin, get_current_user
from app.schemas import (
    CursoAdminResponse,
    CursoCreate,
    CursoDetailResponse,
    CursoResponse,
    CursoUpdate,
    InscricaoCursoResponse,
)

router = APIRouter()


def _normalize_course_price(pago: bool, valor: Decimal | None) -> Decimal | None:
    if not pago:
        return None

    # Temporariamente: se for pago mas não tem valor, usa 0.0 como padrão
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


@router.get("/", response_model=list[CursoResponse])
def list_cursos(db: Session = Depends(get_db)):
    try:
        cursos = _list_public_courses(db)
        print(f"[cursos] list_cursos retornou {len(cursos)} curso(s)")
        result = []
        for curso in cursos:
            try:
                result.append(CursoResponse.model_validate(curso))
            except Exception as e:
                print(f"⚠️  Erro ao validar curso ID {curso.id}: {e}")
                # Skip cursos com problemas de validação
                continue
        return result
    except Exception as e:
        print(f"❌ Erro ao listar cursos: {e}")
        return []


@router.get("/catalogo", response_model=list[CursoResponse])
def list_catalogo(db: Session = Depends(get_db)):
    try:
        cursos = _list_public_courses(db)
        print(f"[cursos] list_catalogo retornou {len(cursos)} curso(s)")
        result = []
        for curso in cursos:
            try:
                result.append(CursoResponse.model_validate(curso))
            except Exception as e:
                print(f"⚠️  Erro ao validar curso ID {curso.id}: {e}")
                # Skip cursos com problemas de validação
                continue
        return result
    except Exception as e:
        print(f"❌ Erro ao listar catálogo: {e}")
        return []


@router.get("/admin/all", response_model=list[CursoAdminResponse])
def list_all_courses_for_admin(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    try:
        cursos = db.query(Curso).order_by(Curso.data_criacao.desc()).all()
        result = []
        for curso in cursos:
            try:
                result.append(CursoAdminResponse.model_validate(curso))
            except Exception as e:
                print(f"⚠️  Erro ao validar curso ID {curso.id}: {e}")
                # Skip cursos com problemas de validação
                continue
        return result
    except Exception as e:
        print(f"❌ Erro ao listar cursos do admin: {e}")
        return []


@router.post("/", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
def create_curso(
    curso_data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
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
    )

    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)

    return CursoResponse.model_validate(db_curso)


@router.get("/{curso_id}", response_model=CursoDetailResponse)
def get_curso(curso_id: int, db: Session = Depends(get_db)):
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

    return CursoDetailResponse.model_validate(curso)


@router.put("/{curso_id}", response_model=CursoResponse)
def update_curso(
    curso_id: int,
    curso_data: CursoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

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
    current_user: Usuario = Depends(get_current_admin),
):
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} nao encontrado",
        )

    db.delete(curso)
    db.commit()
    return None


@router.post("/{curso_id}/inscrever", response_model=InscricaoCursoResponse, status_code=status.HTTP_201_CREATED)
def inscrever_aluno(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
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
            detail="Curso nao encontrado ou indisponivel",
        )

    if curso.pago:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este curso e pago e exige aprovacao do administrador",
        )

    inscricao = InscricaoCurso(usuario_id=current_user.id, curso_id=curso_id)
    db.add(inscricao)
    try:
        db.commit()
        db.refresh(inscricao)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voce ja esta inscrito neste curso",
        )

    return InscricaoCursoResponse.model_validate(inscricao)


@router.get("/{curso_id}/alunos")
def list_alunos_curso(
    curso_id: int,
    current_user: Usuario = Depends(get_current_admin),
):
    return {"message": f"Listar alunos do curso {curso_id} - TODO"}
