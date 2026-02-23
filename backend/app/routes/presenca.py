from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Presenca, Usuario, Aula, Curso, Nota, Resposta, Questao
from app.schemas import (
    PresencaResponse, PresencaDetailResponse, PresencaProgressRequest,
    PresencaAlunoResponse, PresencaCursoResponse
)
from app.routes.auth import get_current_user
from datetime import datetime
from sqlalchemy import func, and_

router = APIRouter()

# ==================== PRESENÇA - ENDPOINTS ====================

@router.get("", response_model=list[PresencaResponse], status_code=200)
async def listar_presencas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Lista todos os registros de presença (admin only)
    """
    # Verificar se é admin
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode listar presenças")
    
    presencas = db.query(Presenca).all()
    return presencas

@router.get("/curso/{curso_id}", response_model=list[PresencaCursoResponse], status_code=200)
async def get_presenca_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém relatório de presença de todos os alunos em um curso (admin only)
    Mostra percentual de presença geral de cada aluno
    """
    # Verificar se é admin
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode acessar relatórios de presença")
    
    # Validar que o curso existe
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    
    # Buscar todas as aulas do curso
    aulas = db.query(Aula).filter(Aula.curso_id == curso_id).all()
    if not aulas:
        return []
    
    aula_ids = [a.id for a in aulas]
    
    # Buscar todos os alunos inscritos no curso
    from app.models import InscricaoCurso
    inscricoes = db.query(InscricaoCurso).filter(InscricaoCurso.curso_id == curso_id).all()
    
    result = []
    for inscricao in inscricoes:
        aluno = inscricao.usuario
        
        # Buscar presenças do aluno em todas as aulas
        presencas = db.query(Presenca).filter(
            Presenca.usuario_id == aluno.id,
            Presenca.aula_id.in_(aula_ids)
        ).all()
        
        # Contar aulas com 75%+ presença
        aulas_75 = sum(1 for p in presencas if p.percentual_assistido >= 75)
        
        # Calcular percentual
        percentual = (aulas_75 / len(aulas) * 100) if len(aulas) > 0 else 0
        
        # Construir lista de presença formatada
        presenca_list = []
        for p in presencas:
            presenca_list.append(PresencaAlunoResponse(
                id=p.id,
                usuario_id=p.usuario_id,
                aula_id=p.aula_id,
                aula_titulo=p.aula.titulo,
                aula_data=p.aula.data_aula,
                percentual_assistido=p.percentual_assistido,
                registrada_automaticamente=p.registrada_automaticamente,
                data_conclusao=p.data_conclusao
            ))
        
        result.append(PresencaCursoResponse(
            aluno_id=aluno.id,
            aluno_nome=aluno.nome,
            aluno_email=aluno.email,
            total_aulas=len(aulas),
            aulas_assistidas_75=aulas_75,
            percentual_presenca=round(percentual, 2),
            presencas=presenca_list
        ))
    
    return result

@router.post("/{aluno_id}/{aula_id}/atualizar-progresso", response_model=PresencaDetailResponse, status_code=200)
async def atualizar_progresso_aula(
    aluno_id: int,
    aula_id: int,
    progress: PresencaProgressRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualiza o progresso de visualização de uma aula (chamado pelo player de vídeo)
    Registra presença automaticamente quando atinge 75% de visualização
    """
    # Validar que o aluno existe e está ativo
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id, Usuario.ativo == True).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado ou inativo")
    
    # Validar que a aula existe
    aula = db.query(Aula).filter(Aula.id == aula_id, Aula.ativo == True).first()
    if not aula:
        raise HTTPException(status_code=404, detail="Aula não encontrada ou inativa")
    
    # Buscar ou criar registro de presença
    presenca = db.query(Presenca).filter(
        Presenca.usuario_id == aluno_id,
        Presenca.aula_id == aula_id
    ).first()
    
    if not presenca:
        presenca = Presenca(
            usuario_id=aluno_id,
            aula_id=aula_id,
            percentual_assistido=progress.percentual_assistido,
            tempo_total_segundos=progress.tempo_total_segundos,
            data_acesso=datetime.utcnow()
        )
    else:
        # Atualizar percentual e tempo se forem maiores
        presenca.percentual_assistido = max(presenca.percentual_assistido, progress.percentual_assistido)
        presenca.tempo_total_segundos = max(presenca.tempo_total_segundos, progress.tempo_total_segundos)
    
    # Se atingiu 75%+, registrar automaticamente e definir data de conclusão
    if presenca.percentual_assistido >= 75:
        presenca.registrada_automaticamente = True
        if not presenca.data_conclusao:
            presenca.data_conclusao = datetime.utcnow()
    
    db.add(presenca)
    db.commit()
    db.refresh(presenca)
    
    # Construir response com detalhes
    return PresencaDetailResponse(
        id=presenca.id,
        usuario_id=presenca.usuario_id,
        aula_id=presenca.aula_id,
        percentual_assistido=presenca.percentual_assistido,
        registrada_automaticamente=presenca.registrada_automaticamente,
        tempo_total_segundos=presenca.tempo_total_segundos,
        data_acesso=presenca.data_acesso,
        data_conclusao=presenca.data_conclusao,
        usuario_nome=aluno.nome,
        aula_titulo=aula.titulo,
        aula_duracao_minutos=aula.duracao_minutos
    )

@router.get("/{aluno_id}/{aula_id}", response_model=PresencaDetailResponse, status_code=200)
async def get_presenca_aula(
    aluno_id: int,
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém presença de um aluno em uma aula específica
    Aluno pode ver apenas seus registros, admin pode ver de qualquer aluno
    """
    # Verificar permissão
    if current_user.role.value != "admin" and current_user.id != aluno_id:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    # Buscar presença
    presenca = db.query(Presenca).filter(
        Presenca.usuario_id == aluno_id,
        Presenca.aula_id == aula_id
    ).first()
    
    if not presenca:
        raise HTTPException(status_code=404, detail="Presença não encontrada")
    
    return PresencaDetailResponse(
        id=presenca.id,
        usuario_id=presenca.usuario_id,
        aula_id=presenca.aula_id,
        percentual_assistido=presenca.percentual_assistido,
        registrada_automaticamente=presenca.registrada_automaticamente,
        tempo_total_segundos=presenca.tempo_total_segundos,
        data_acesso=presenca.data_acesso,
        data_conclusao=presenca.data_conclusao,
        usuario_nome=presenca.usuario.nome,
        aula_titulo=presenca.aula.titulo,
        aula_duracao_minutos=presenca.aula.duracao_minutos
    )

@router.get("/{aluno_id}", response_model=list[PresencaAlunoResponse], status_code=200)
async def get_presenca_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtém todos os registros de presença de um aluno
    Aluno pode ver apenas seus registros, admin pode ver de qualquer aluno
    """
    # Verificar permissão
    if current_user.role.value != "admin" and current_user.id != aluno_id:
        raise HTTPException(status_code=403, detail="Permissão negada")
    
    # Validar que o aluno existe
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    
    # Buscar presenças com detalhes da aula
    presencas = db.query(Presenca).filter(Presenca.usuario_id == aluno_id).all()
    
    if not presencas:
        return []
    
    result = []
    for p in presencas:
        result.append(PresencaAlunoResponse(
            id=p.id,
            usuario_id=p.usuario_id,
            aula_id=p.aula_id,
            aula_titulo=p.aula.titulo,
            aula_data=p.aula.data_aula,
            percentual_assistido=p.percentual_assistido,
            registrada_automaticamente=p.registrada_automaticamente,
            data_conclusao=p.data_conclusao
        ))
    
    return result
