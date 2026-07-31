from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Nota, NotaCurso, Usuario, Prova, Curso, Aula
from app.schemas import (
    NotaResponse, NotaDetailResponse, NotaListResponse, NotaCreate, NotaUpdate,
    NotaCursoResponse, NotaCursoDetailResponse, NotaCursoCreate, NotaCursoUpdate
)
from app.routes.auth import get_current_user
from app.security.tenant import TenantContext, tenant_context
from app.services.admin_course_access import get_allowed_course_ids, ensure_admin_can_access_course
from datetime import datetime
from decimal import Decimal
from sqlalchemy import and_

router = APIRouter()

# ==================== NOTAS - ENDPOINTS ====================

@router.get("", response_model=list[NotaListResponse], status_code=200)
async def listar_notas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Lista todas as notas (admin only)
    """
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode listar todas as notas")

    # Join com Prova para filtro de tenant (Nota não tem faculdade_id direto)
    query = db.query(Nota).join(Prova, Nota.prova_id == Prova.id)
    query = tc.filter_query(query, Prova.faculdade_id)

    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            return []
        query = query.filter(Prova.curso_id.in_(allowed))

    notas = query.all()
    
    result = []
    for n in notas:
        result.append(NotaListResponse(
            id=n.id,
            usuario_id=n.usuario_id,
            prova_id=n.prova_id,
            nota_final=n.nota_final,
            tentativa=n.tentativa,
            observacoes=n.observacoes,
            data_submissao=n.data_submissao,
            data_correcao=n.data_correcao,
            data_criacao=n.data_criacao,
            usuario_nome=n.usuario.nome if n.usuario else None,
            prova_titulo=n.prova.titulo if n.prova else None
        ))
    
    return result

@router.get("/{aluno_id}", response_model=list[NotaListResponse], status_code=200)
async def get_notas_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Obtém todas as notas de um aluno.
    Aluno pode ver suas próprias notas, admin vê de qualquer um dentro do tenant.
    """
    # Verificar permissão
    if current_user.role.value != "admin" and current_user.id != aluno_id:
        raise HTTPException(status_code=403, detail="Permissão negada")

    # Validar que o aluno existe
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Bloquear admin de ver notas de alunos de outro tenant
    if current_user.role.value == "admin":
        tc.assert_access(aluno.faculdade_id)

    # Buscar notas do aluno (filtrando por cursos permitidos para admins restritos)
    query = db.query(Nota).join(Prova, Nota.prova_id == Prova.id).filter(Nota.usuario_id == aluno_id)
    if current_user.role.value == "admin":
        allowed = get_allowed_course_ids(db, current_user)
        if allowed is not None:
            if not allowed:
                return []
            query = query.filter(Prova.curso_id.in_(allowed))
    notas = query.all()
    
    result = []
    for n in notas:
        result.append(NotaListResponse(
            id=n.id,
            usuario_id=n.usuario_id,
            prova_id=n.prova_id,
            nota_final=n.nota_final,
            tentativa=n.tentativa,
            observacoes=n.observacoes,
            data_submissao=n.data_submissao,
            data_correcao=n.data_correcao,
            data_criacao=n.data_criacao,
            usuario_nome=n.usuario.nome,
            prova_titulo=n.prova.titulo
        ))
    
    return result

@router.get("/{aluno_id}/{prova_id}", response_model=NotaDetailResponse, status_code=200)
async def get_nota_prova(
    aluno_id: int,
    prova_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Obtém a nota de um aluno em uma prova específica
    Aluno pode ver sua nota, admin vê de qualquer um — dentro do próprio tenant.
    """
    # Verificar permissão
    if current_user.role.value != "admin" and current_user.id != aluno_id:
        raise HTTPException(status_code=403, detail="Permissão negada")

    # Buscar nota
    nota = db.query(Nota).filter(
        Nota.usuario_id == aluno_id,
        Nota.prova_id == prova_id
    ).first()

    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")

    # Sem esta checagem a rota entregava a nota de qualquer aluno de qualquer
    # faculdade — basta conhecer os dois ids. O aluno já está limitado a si
    # mesmo pela checagem acima; o assert é o que falta para o admin.
    if current_user.role.value == "admin":
        tc.assert_access(nota.prova.faculdade_id if nota.prova else None)

    return NotaDetailResponse(
        id=nota.id,
        usuario_id=nota.usuario_id,
        prova_id=nota.prova_id,
        nota_final=nota.nota_final,
        tentativa=nota.tentativa,
        observacoes=nota.observacoes,
        data_submissao=nota.data_submissao,
        data_correcao=nota.data_correcao,
        data_criacao=nota.data_criacao,
        usuario_nome=nota.usuario.nome,
        prova_titulo=nota.prova.titulo,
        prova_curso_id=nota.prova.curso_id if nota.prova else None
    )

@router.put("/{nota_id}", response_model=NotaDetailResponse, status_code=200)
async def atualizar_nota(
    nota_id: int,
    nota_update: NotaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Atualiza a nota de um aluno (admin only)
    Pode atualizar nota_final e observações
    """
    # Verificar se é admin
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode atualizar notas")
    
    # Buscar nota
    nota = db.query(Nota).filter(Nota.id == nota_id).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    if nota.prova:
        tc.assert_access(nota.prova.faculdade_id)
        ensure_admin_can_access_course(db, current_user, nota.prova.curso_id)
    
    # Atualizar campos
    if nota_update.nota_final is not None:
        nota.nota_final = nota_update.nota_final
        nota.data_correcao = datetime.utcnow()
    
    if nota_update.observacoes is not None:
        nota.observacoes = nota_update.observacoes
    
    nota.data_atualizacao = datetime.utcnow()
    db.commit()
    db.refresh(nota)
    
    return NotaDetailResponse(
        id=nota.id,
        usuario_id=nota.usuario_id,
        prova_id=nota.prova_id,
        nota_final=nota.nota_final,
        tentativa=nota.tentativa,
        observacoes=nota.observacoes,
        data_submissao=nota.data_submissao,
        data_correcao=nota.data_correcao,
        data_criacao=nota.data_criacao,
        usuario_nome=nota.usuario.nome,
        prova_titulo=nota.prova.titulo,
        prova_curso_id=nota.prova.curso_id if nota.prova else None
    )

@router.get("/curso/{curso_id}", response_model=list[NotaCursoDetailResponse], status_code=200)
async def get_notas_curso(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Obtém relatório detalhado de notas de um curso (admin only)
    Mostra média final e status de aprovação para cada aluno
    """
    # Verificar se é admin
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode acessar relatórios de notas")

    # Validar que o curso existe
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    tc.assert_access(curso.faculdade_id)
    ensure_admin_can_access_course(db, current_user, curso_id)

    # Buscar todas as notas do curso através das provas
    prova_ids = db.query(Prova.id).filter(Prova.curso_id == curso_id).all()
    prova_ids = [p[0] for p in prova_ids]
    
    if not prova_ids:
        return []
    
    # Buscar unicas NotaCurso para este curso
    notas_cursos = db.query(NotaCurso).filter(NotaCurso.curso_id == curso_id).all()
    
    result = []
    for nc in notas_cursos:
        # Buscar todas as notas das provas deste aluno neste curso
        notas_provas = db.query(Nota).filter(
            Nota.usuario_id == nc.usuario_id,
            Nota.prova_id.in_(prova_ids)
        ).all()
        
        notas_list = []
        for n in notas_provas:
            notas_list.append(NotaListResponse(
                id=n.id,
                usuario_id=n.usuario_id,
                prova_id=n.prova_id,
                nota_final=n.nota_final,
                tentativa=n.tentativa,
                observacoes=n.observacoes,
                data_submissao=n.data_submissao,
                data_correcao=n.data_correcao,
                data_criacao=n.data_criacao,
                usuario_nome=n.usuario.nome,
                prova_titulo=n.prova.titulo
            ))
        
        result.append(NotaCursoDetailResponse(
            id=nc.id,
            usuario_id=nc.usuario_id,
            curso_id=nc.curso_id,
            media_final=nc.media_final,
            aprovado=nc.aprovado,
            data_atualizacao=nc.data_atualizacao,
            usuario_nome=nc.usuario.nome if nc.usuario else None,
            curso_nome=nc.curso.nome if nc.curso else None,
            notas_provas=notas_list
        ))
    
    return result

@router.post("/{aluno_id}/{curso_id}/calcular-media", response_model=NotaCursoDetailResponse, status_code=200)
async def calcular_media_curso(
    aluno_id: int,
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Calcula a média final de um aluno em um curso (admin only)
    Atualiza NotaCurso com media_final e aprovado (>= 7)
    """
    # Verificar se é admin
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Apenas admin pode calcular médias")

    # Validar que o aluno existe
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    # Validar que o curso existe
    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    # Escrita: aluno e curso precisam ser do tenant do chamador.
    tc.assert_access(curso.faculdade_id)
    tc.assert_access(aluno.faculdade_id)
    ensure_admin_can_access_course(db, current_user, curso_id)

    # Buscar todas as provas do curso
    provas = db.query(Prova).filter(Prova.curso_id == curso_id).all()
    if not provas:
        raise HTTPException(status_code=400, detail="Curso não possui provas para calcular média")
    
    prova_ids = [p.id for p in provas]
    
    # Buscar todas as notas do aluno nessas provas
    notas = db.query(Nota).filter(
        Nota.usuario_id == aluno_id,
        Nota.prova_id.in_(prova_ids)
    ).all()
    
    if not notas:
        raise HTTPException(status_code=400, detail="Aluno não possui notas neste curso")
    
    # Calcular média (apenas de notas com nota_final preenchida)
    notas_com_valor = [n for n in notas if n.nota_final is not None]
    if not notas_com_valor:
        raise HTTPException(status_code=400, detail="Nenhuma nota com valor foi encontrada")
    
    media = sum(n.nota_final for n in notas_com_valor) / len(notas_com_valor)
    media = Decimal(str(round(float(media), 2)))
    
    # Determinar se foi aprovado (>= 7)
    aprovado = media >= 7
    
    # Buscar ou criar NotaCurso
    nota_curso = db.query(NotaCurso).filter(
        NotaCurso.usuario_id == aluno_id,
        NotaCurso.curso_id == curso_id
    ).first()
    
    if not nota_curso:
        nota_curso = NotaCurso(
            usuario_id=aluno_id,
            curso_id=curso_id,
            media_final=media,
            aprovado=aprovado
        )
    else:
        nota_curso.media_final = media
        nota_curso.aprovado = aprovado
        nota_curso.data_atualizacao = datetime.utcnow()
    
    db.add(nota_curso)
    db.commit()
    db.refresh(nota_curso)
    
    # Buscar notas para retorno
    notas_list = []
    for n in notas:
        notas_list.append(NotaListResponse(
            id=n.id,
            usuario_id=n.usuario_id,
            prova_id=n.prova_id,
            nota_final=n.nota_final,
            tentativa=n.tentativa,
            observacoes=n.observacoes,
            data_submissao=n.data_submissao,
            data_correcao=n.data_correcao,
            data_criacao=n.data_criacao,
            usuario_nome=n.usuario.nome,
            prova_titulo=n.prova.titulo
        ))
    
    return NotaCursoDetailResponse(
        id=nota_curso.id,
        usuario_id=nota_curso.usuario_id,
        curso_id=nota_curso.curso_id,
        media_final=nota_curso.media_final,
        aprovado=nota_curso.aprovado,
        data_atualizacao=nota_curso.data_atualizacao,
        usuario_nome=aluno.nome,
        curso_nome=curso.nome,
        notas_provas=notas_list
    )

@router.get("/aluno/{aluno_id}/curso/{curso_id}", response_model=NotaCursoDetailResponse, status_code=200)
async def get_nota_curso_aluno(
    aluno_id: int,
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Obtém a nota (média) de um aluno em um curso específico
    Aluno pode ver sua nota, admin vê de qualquer um — dentro do próprio tenant.
    """
    # Verificar permissão
    if current_user.role.value != "admin" and current_user.id != aluno_id:
        raise HTTPException(status_code=403, detail="Permissão negada")

    curso = db.query(Curso).filter(Curso.id == curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail="Curso não encontrado")

    # O aluno já está limitado às próprias notas; o assert fecha o acesso
    # cruzado do admin, que podia ler a média de qualquer curso de qualquer
    # faculdade.
    if current_user.role.value == "admin":
        tc.assert_access(curso.faculdade_id)
        ensure_admin_can_access_course(db, current_user, curso_id)

    # Buscar NotaCurso
    nota_curso = db.query(NotaCurso).filter(
        NotaCurso.usuario_id == aluno_id,
        NotaCurso.curso_id == curso_id
    ).first()
    
    if not nota_curso:
        raise HTTPException(status_code=404, detail="Nota de curso não encontrada")
    
    # Buscar notas das provas do curso
    prova_ids = db.query(Prova.id).filter(Prova.curso_id == curso_id).all()
    prova_ids = [p[0] for p in prova_ids]
    
    notas = db.query(Nota).filter(
        Nota.usuario_id == aluno_id,
        Nota.prova_id.in_(prova_ids) if prova_ids else False
    ).all()
    
    notas_list = []
    for n in notas:
        notas_list.append(NotaListResponse(
            id=n.id,
            usuario_id=n.usuario_id,
            prova_id=n.prova_id,
            nota_final=n.nota_final,
            tentativa=n.tentativa,
            observacoes=n.observacoes,
            data_submissao=n.data_submissao,
            data_correcao=n.data_correcao,
            data_criacao=n.data_criacao,
            usuario_nome=n.usuario.nome if n.usuario else None,
            prova_titulo=n.prova.titulo if n.prova else None
        ))
    
    return NotaCursoDetailResponse(
        id=nota_curso.id,
        usuario_id=nota_curso.usuario_id,
        curso_id=nota_curso.curso_id,
        media_final=nota_curso.media_final,
        aprovado=nota_curso.aprovado,
        data_atualizacao=nota_curso.data_atualizacao,
        usuario_nome=nota_curso.usuario.nome if nota_curso.usuario else None,
        curso_nome=nota_curso.curso.nome if nota_curso.curso else None,
        notas_provas=notas_list
    )
