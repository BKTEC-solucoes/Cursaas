from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import Curso, InscricaoCurso, Usuario, AdminCurso, AdminRoleEnum
from app.schemas import CursoCreate, CursoUpdate, CursoResponse, CursoDetailResponse, InscricaoCursoResponse
from app.routes.auth import get_current_user
from app.services.admin_course_access import get_allowed_course_ids, ensure_admin_can_access_course

router = APIRouter()

@router.get("/", response_model=list[CursoDetailResponse])
def list_cursos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista todos os cursos ativos.
    
    **Retorna:**
    - Lista de cursos com ID, nome, descrição, percentual mínimo de presença, aulas e provas
    """
    query = db.query(Curso).filter(Curso.ativo == True)

    # Admin não-super/legado enxerga apenas cursos vinculados
    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(Curso.id.in_(allowed))

    cursos = query.all()
    return [CursoDetailResponse.model_validate(c) for c in cursos]

@router.post("/", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
def create_curso(
    curso_data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem criar cursos")

    # Criar novo curso
    # Verificar se já existe curso com esse nome
    existing = db.query(Curso).filter(Curso.nome == curso_data.nome).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um curso com o nome '{curso_data.nome}'"
        )
    
    # Criar novo curso
    db_curso = Curso(
        nome=curso_data.nome,
        descricao=curso_data.descricao,
        percentual_presenca_minima=curso_data.percentual_presenca_minima,
        ativo=True
    )
    
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)

    # Instrutor recebe acesso automático ao curso que criou
    if current_user.admin_role == AdminRoleEnum.instrutor:
        db.add(AdminCurso(admin_id=current_user.id, curso_id=db_curso.id))
        db.commit()

    return CursoResponse.model_validate(db_curso)

@router.get("/{curso_id}", response_model=CursoDetailResponse)
def get_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Obtém detalhes completos de um curso incluindo aulas e provas.
    
    **Parâmetros:**
    - `curso_id` (int): ID do curso
    
    **Retorna:**
    - Dados do curso com aulas e provas relacionadas
    
    **Erros:**
    - 404: Curso não encontrado
    """
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} não encontrado"
        )
    

    if current_user.role == "admin":
        ensure_admin_can_access_course(db, current_user, curso_id)

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
            detail=f"Curso {curso_id} não encontrado"
        )

    ensure_admin_can_access_course(db, current_user, curso_id)

    # Verificar duplicação de nome se estiver sendo alterado
    if curso_data.nome and curso_data.nome != curso.nome:
        existing = db.query(Curso).filter(
            Curso.nome == curso_data.nome,
            Curso.id != curso_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro curso com o nome '{curso_data.nome}'"
            )
    
    # Atualizar apenas os campos fornecidos
    update_data = curso_data.model_dump(exclude_unset=True)
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
            detail=f"Curso {curso_id} não encontrado"
        )

    ensure_admin_can_access_course(db, current_user, curso_id)

    db.delete(curso)
    db.commit()

    return None

@router.post("/{curso_id}/inscrever", response_model=InscricaoCursoResponse, status_code=status.HTTP_201_CREATED)
def inscrever_aluno(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Inscreve o usuário autenticado em um curso."""
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.ativo == True).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso não encontrado ou inativo")

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
def list_alunos_curso(curso_id: int):
    """Lista alunos inscritos em um curso (admin)"""
    return {"message": f"Listar alunos do curso {curso_id} - TODO"}
