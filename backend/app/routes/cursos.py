from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import Curso, InscricaoCurso, Usuario
from app.schemas import CursoCreate, CursoUpdate, CursoResponse, CursoDetailResponse, InscricaoCursoResponse
from app.routes.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=list[CursoDetailResponse])
def list_cursos(db: Session = Depends(get_db)):
    """
    Lista todos os cursos ativos.
    
    **Retorna:**
    - Lista de cursos com ID, nome, descrição, percentual mínimo de presença, aulas e provas
    """
    cursos = db.query(Curso).filter(Curso.ativo == True).all()
    return [CursoDetailResponse.model_validate(c) for c in cursos]

@router.post("/", response_model=CursoResponse, status_code=status.HTTP_201_CREATED)
def create_curso(curso_data: CursoCreate, db: Session = Depends(get_db)):
    """
    Cria um novo curso (apenas admin).
    
    **Parâmetros:**
    - `nome` (str, obrigatório): Nome do curso
    - `descricao` (str, opcional): Descrição do curso
    - `percentual_presenca_minima` (int, padrão 75): Percentual mínimo de presença (0-100)
    
    **Retorna:**
    - Dados do curso criado incluindo ID e timestamp
    """
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
    
    return CursoResponse.model_validate(db_curso)

@router.get("/{curso_id}", response_model=CursoDetailResponse)
def get_curso(curso_id: int, db: Session = Depends(get_db)):
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
    
    return CursoDetailResponse.model_validate(curso)

@router.put("/{curso_id}", response_model=CursoResponse)
def update_curso(
    curso_id: int,
    curso_data: CursoUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza um curso existente (apenas admin).
    
    **Parâmetros:**
    - `curso_id` (int): ID do curso a atualizar
    - `nome` (str, opcional): Novo nome
    - `descricao` (str, opcional): Nova descrição
    - `percentual_presenca_minima` (int, opcional): Novo percentual mínimo
    - `ativo` (bool, opcional): Ativar/desativar curso
    
    **Retorna:**
    - Dados atualizados do curso
    
    **Erros:**
    - 404: Curso não encontrado
    """
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} não encontrado"
        )
    
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
def delete_curso(curso_id: int, db: Session = Depends(get_db)):
    """
    Deleta um curso (apenas admin).
    
    ⚠️ **Cuidado:** Ao deletar, todas as inscrições, aulas, provas e notas associadas também serão deletadas.
    
    **Parâmetros:**
    - `curso_id` (int): ID do curso a deletar
    
    **Retorna:**
    - 204 No Content (sem corpo)
    
    **Erros:**
    - 404: Curso não encontrado
    """
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {curso_id} não encontrado"
        )
    
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
