from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from app.database import get_db
from app.models import Prova, Questao, OpcaoResposta, Resposta, Nota, Usuario, Curso
from app.schemas import (
    ProvaCreate, ProvaUpdate, ProvaResponse, ProvaDetailResponse,
    QuestaoCreateRequest, QuestaoUpdate, QuestaoResponse, QuestaoDetailResponse,
    OpcaoRespostaCreate, OpcaoRespostaDetailResponse,
    RespostaResponse, ProvaSubmitRequest, ProvaResultResponse
)
from app.routes.auth import get_current_user

router = APIRouter()

# ============================================================================
# PROVAS - CRUD
# ============================================================================

@router.get("/", response_model=list[ProvaResponse])
async def list_provas(
    db: Session = Depends(get_db),
    curso_id: int = Query(None, description="Filtrar por ID do curso"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Lista todas as provas ativas com paginação.
    
    **Query Parameters:**
    - `curso_id`: Filtrar por ID do curso (opcional)
    - `skip`: Número de registros a pular (padrão: 0)
    - `limit`: Número máximo de registros a retornar (padrão: 10, máx: 100)
    
    **Returns:**
    - Lista de provas
    
    **Status Codes:**
    - 200: Sucesso
    """
    query = db.query(Prova).filter(Prova.ativo == True)
    
    if curso_id:
        query = query.filter(Prova.curso_id == curso_id)
    
    provas = query.offset(skip).limit(limit).all()
    return provas

@router.post("/", response_model=ProvaResponse, status_code=201)
async def create_prova(
    prova: ProvaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Criar uma nova prova (apenas administrador).
    
    **Body Parameters:**
    - `titulo`: Título da prova
    - `descricao`: Descrição (opcional)
    - `data_inicio`: Data e hora de início
    - `data_fim`: Data e hora de término
    - `tempo_limite_minutos`: Tempo limite em minutos (opcional)
    - `tentativas_permitidas`: Número de tentativas permitidas (padrão: 1)
    - `curso_id`: ID do curso
    
    **Validações:**
    - Apenas administradores podem criar provas (403 se não for admin)
    - Curso deve existir (404 se não existir)
    - data_inicio deve ser menor que data_fim (400)
    
    **Returns:**
    - Prova criada
    
    **Status Codes:**
    - 201: Prova criada com sucesso
    - 400: Dados inválidos ou datas inconsistentes
    - 403: Sem permissão (não é admin)
    - 404: Curso não encontrado
    """
    # Verificar permissão (admin only)
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar provas")
    
    # Validar datas
    if prova.data_inicio >= prova.data_fim:
        raise HTTPException(
            status_code=400,
            detail="data_inicio deve ser menor que data_fim"
        )
    
    # Verificar se o curso existe
    curso = db.query(Curso).filter(Curso.id == prova.curso_id).first()
    if not curso:
        raise HTTPException(status_code=404, detail=f"Curso {prova.curso_id} não encontrado")
    
    # Criar nova prova
    db_prova = Prova(**prova.model_dump())
    db.add(db_prova)
    db.commit()
    db.refresh(db_prova)
    
    return db_prova

@router.get("/{prova_id}", response_model=ProvaDetailResponse)
async def get_prova(
    prova_id: int,
    db: Session = Depends(get_db)
):
    """
    Obter detalhes de uma prova específica com todas as questões e opções.
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    
    **Returns:**
    - Prova com questões e opções de resposta
    
    **Status Codes:**
    - 200: Sucesso
    - 404: Prova não encontrada
    """
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    return prova

@router.put("/{prova_id}", response_model=ProvaResponse)
async def update_prova(
    prova_id: int,
    prova_update: ProvaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualizar uma prova existente (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    
    **Body Parameters:**
    - `titulo`: Novo título (opcional)
    - `descricao`: Nova descrição (opcional)
    - `data_inicio`: Nova data de início (opcional)
    - `data_fim`: Nova data de término (opcional)
    - `tempo_limite_minutos`: Novo tempo limite (opcional)
    - `tentativas_permitidas`: Novo número de tentativas (opcional)
    - `ativo`: Ativar/desativar prova (opcional)
    
    **Validações:**
    - Apenas administradores podem atualizar (403)
    - Se data_inicio ou data_fim forem alteradas, validar se data_inicio < data_fim
    
    **Returns:**
    - Prova atualizada
    
    **Status Codes:**
    - 200: Sucesso
    - 400: Dados inválidos
    - 403: Sem permissão
    - 404: Prova não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar provas")
    
    # Buscar prova
    db_prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not db_prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Validar datas se fornecidas
    data_inicio = prova_update.data_inicio or db_prova.data_inicio
    data_fim = prova_update.data_fim or db_prova.data_fim
    
    if data_inicio >= data_fim:
        raise HTTPException(
            status_code=400,
            detail="data_inicio deve ser menor que data_fim"
        )
    
    # Atualizar campos
    for field, value in prova_update.model_dump(exclude_unset=True).items():
        setattr(db_prova, field, value)
    
    db_prova.data_atualizacao = datetime.utcnow()
    db.add(db_prova)
    db.commit()
    db.refresh(db_prova)
    
    return db_prova

@router.delete("/{prova_id}", status_code=204)
async def delete_prova(
    prova_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Deletar uma prova e todas as questões associadas (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova a deletar
    
    **Validações:**
    - Apenas administradores podem deletar (403)
    
    **Returns:**
    - Sem conteúdo (204)
    
    **Status Codes:**
    - 204: Prova deletada com sucesso
    - 403: Sem permissão
    - 404: Prova não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar provas")
    
    # Buscar prova
    db_prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not db_prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Deletar (cascade delete remove questões, opções e respostas)
    db.delete(db_prova)
    db.commit()

# ============================================================================
# QUESTÕES - CRUD
# ============================================================================

@router.post("/{prova_id}/questoes", response_model=QuestaoDetailResponse, status_code=201)
async def create_questao(
    prova_id: int,
    questao: QuestaoCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Criar uma nova questão em uma prova (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    
    **Body Parameters:**
    - `enunciado`: Texto da questão
    - `tipo`: Tipo de questão ("multipla_escolha" ou "dissertativa", padrão: multipla_escolha)
    - `ordem`: Ordem da questão (opcional)
    - `pontos`: Pontos da questão (padrão: 1.00)
    
    **Validações:**
    - Apenas administradores podem criar questões (403)
    - Prova deve existir (404)
    
    **Returns:**
    - Questão criada
    
    **Status Codes:**
    - 201: Questão criada
    - 403: Sem permissão
    - 404: Prova não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar questões")
    
    # Verificar se prova existe
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Criar questão com prova_id
    questao_data = questao.model_dump()
    questao_data["prova_id"] = prova_id
    db_questao = Questao(**questao_data)
    db.add(db_questao)
    db.commit()
    db.refresh(db_questao)
    
    return db_questao

@router.put("/{prova_id}/questoes/{questao_id}", response_model=QuestaoDetailResponse)
async def update_questao(
    prova_id: int,
    questao_id: int,
    questao_update: QuestaoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Atualizar uma questão (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    - `questao_id`: ID da questão
    
    **Body Parameters:**
    - `enunciado`: Novo enunciado (opcional)
    - `tipo`: Novo tipo (opcional)
    - `ordem`: Nova ordem (opcional)
    - `pontos`: Novos pontos (opcional)
    
    **Returns:**
    - Questão atualizada
    
    **Status Codes:**
    - 200: Sucesso
    - 403: Sem permissão
    - 404: Prova ou questão não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar questões")
    
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Buscar questão
    db_questao = db.query(Questao).filter(
        Questao.id == questao_id,
        Questao.prova_id == prova_id
    ).first()
    
    if not db_questao:
        raise HTTPException(status_code=404, detail=f"Questão {questao_id} não encontrada")
    
    # Atualizar
    for field, value in questao_update.model_dump(exclude_unset=True).items():
        setattr(db_questao, field, value)
    
    db.add(db_questao)
    db.commit()
    db.refresh(db_questao)
    
    return db_questao

@router.delete("/{prova_id}/questoes/{questao_id}", status_code=204)
async def delete_questao(
    prova_id: int,
    questao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Deletar uma questão (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    - `questao_id`: ID da questão
    
    **Returns:**
    - Sem conteúdo (204)
    
    **Status Codes:**
    - 204: Questão deletada
    - 403: Sem permissão
    - 404: Prova ou questão não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar questões")
    
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Buscar questão
    db_questao = db.query(Questao).filter(
        Questao.id == questao_id,
        Questao.prova_id == prova_id
    ).first()
    
    if not db_questao:
        raise HTTPException(status_code=404, detail=f"Questão {questao_id} não encontrada")
    
    db.delete(db_questao)
    db.commit()

# ============================================================================
# OPÇÕES DE RESPOSTA - CRUD
# ============================================================================

@router.post(
    "/{prova_id}/questoes/{questao_id}/opcoes",
    response_model=OpcaoRespostaDetailResponse,
    status_code=201
)
async def create_opcao(
    prova_id: int,
    questao_id: int,
    opcao: OpcaoRespostaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Criar uma opção de resposta para uma questão (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    - `questao_id`: ID da questão
    
    **Body Parameters:**
    - `texto`: Texto da opção
    - `correta`: Se é a resposta correta (padrão: false)
    - `ordem`: Ordem da opção (opcional)
    
    **Returns:**
    - Opção criada
    
    **Status Codes:**
    - 201: Opção criada
    - 403: Sem permissão
    - 404: Prova ou questão não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar opções")
    
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Verificar questão
    questao = db.query(Questao).filter(
        Questao.id == questao_id,
        Questao.prova_id == prova_id
    ).first()
    
    if not questao:
        raise HTTPException(status_code=404, detail=f"Questão {questao_id} não encontrada")
    
    # Criar opção
    db_opcao = OpcaoResposta(questao_id=questao_id, **opcao.model_dump())
    db.add(db_opcao)
    db.commit()
    db.refresh(db_opcao)
    
    return db_opcao

@router.delete("/{prova_id}/questoes/{questao_id}/opcoes/{opcao_id}", status_code=204)
async def delete_opcao(
    prova_id: int,
    questao_id: int,
    opcao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Deletar uma opção de resposta (apenas administrador).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    - `questao_id`: ID da questão
    - `opcao_id`: ID da opção
    
    **Status Codes:**
    - 204: Opção deletada
    - 403: Sem permissão
    - 404: Prova, questão ou opção não encontrada
    """
    # Verificar permissão
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem deletar opções")
    
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Verificar questão
    questao = db.query(Questao).filter(
        Questao.id == questao_id,
        Questao.prova_id == prova_id
    ).first()
    
    if not questao:
        raise HTTPException(status_code=404, detail=f"Questão {questao_id} não encontrada")
    
    # Buscar opção
    db_opcao = db.query(OpcaoResposta).filter(
        OpcaoResposta.id == opcao_id,
        OpcaoResposta.questao_id == questao_id
    ).first()
    
    if not db_opcao:
        raise HTTPException(status_code=404, detail=f"Opção {opcao_id} não encontrada")
    
    db.delete(db_opcao)
    db.commit()

# ============================================================================
# SUBMISSÃO DE RESPOSTAS
# ============================================================================

@router.post("/{prova_id}/responder", response_model=ProvaResultResponse, status_code=201)
async def submit_respostas(
    prova_id: int,
    submission: ProvaSubmitRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Submeter respostas para uma prova (apenas alunos).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    
    **Body Parameters:**
    - `respostas`: Lista de respostas
      - `questao_id`: ID da questão
      - `opcao_id`: ID da opção (para múltipla escolha, opcional)
      - `texto_resposta`: Texto da resposta (para dissertativa, opcional)
    
    **Validações:**
    - Prova deve existir e estar ativa (404 ou 400)
    - Data da prova deve estar no período permitido (400)
    - Aluno não pode ter excedido tentativas (400)
    - Todas as questões devem ter uma resposta (400)
    
    **Returns:**
    - Resultado com nota final e acertos
    
    **Status Codes:**
    - 201: Respostas submetidas
    - 400: Erro de validação ou período inválido
    - 404: Prova não encontrada
    """
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    if not prova.ativo:
        raise HTTPException(status_code=400, detail="Prova não está ativa")
    
    # Verificar período (data_inicio <= agora <= data_fim)
    agora = datetime.utcnow()
    if agora < prova.data_inicio:
        raise HTTPException(status_code=400, detail="Prova ainda não foi liberada")
    
    if agora > prova.data_fim:
        raise HTTPException(status_code=400, detail="Prova expirou")
    
    # Verificar tentativas
    tentativas_feitas = db.query(Resposta).filter(
        Resposta.usuario_id == current_user.id,
        Resposta.prova_id == prova_id
    ).count()
    
    if tentativas_feitas > 0 and prova.tentativas_permitidas == 1:
        raise HTTPException(status_code=400, detail="Você já respondeu esta prova")
    
    # Buscar questões da prova
    questoes = db.query(Questao).filter(Questao.prova_id == prova_id).all()
    questoes_dict = {q.id: q for q in questoes}
    
    if not questoes:
        raise HTTPException(status_code=400, detail="Prova não possui questões")
    
    # Validar que todas as questões foram respondidas
    if len(submission.respostas) != len(questoes):
        raise HTTPException(
            status_code=400,
            detail=f"Você deve responder todas as {len(questoes)} questões"
        )
    
    # Processar respostas
    total_acertos = 0
    respostas_salvas = []
    
    for resposta_item in submission.respostas:
        questao_id = resposta_item.questao_id
        
        if questao_id not in questoes_dict:
            raise HTTPException(status_code=400, detail=f"Questão {questao_id} não existe")
        
        questao = questoes_dict[questao_id]
        
        # Validar resposta baseado no tipo
        correta = False
        if questao.tipo == "multipla_escolha":
            if not resposta_item.opcao_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Questão {questao_id} requer opcao_id"
                )
            
            # Verificar se opção existe
            opcao = db.query(OpcaoResposta).filter(
                OpcaoResposta.id == resposta_item.opcao_id,
                OpcaoResposta.questao_id == questao_id
            ).first()
            
            if not opcao:
                raise HTTPException(status_code=400, detail=f"Opção inválida para questão {questao_id}")
            
            correta = opcao.correta
            if correta:
                total_acertos += 1
        
        elif questao.tipo == "dissertativa":
            if not resposta_item.texto_resposta:
                raise HTTPException(
                    status_code=400,
                    detail=f"Questão {questao_id} requer texto_resposta"
                )
            # Respostas dissertativas não são corrigidas automaticamente
            correta = None
        
        # Salvar resposta
        db_resposta = Resposta(
            usuario_id=current_user.id,
            prova_id=prova_id,
            questao_id=questao_id,
            opcao_id=resposta_item.opcao_id,
            texto_resposta=resposta_item.texto_resposta,
            correta=correta,
            data_resposta=datetime.utcnow()
        )
        db.add(db_resposta)
        db.flush()  # Flush para obter o ID
        respostas_salvas.append(db_resposta)
    
    # Calcular nota final
    total_questoes = len(questoes)
    
    # Contar apenas questões de múltipla escolha
    multipla_escolha_count = sum(1 for q in questoes if q.tipo == "multipla_escolha")
    
    if multipla_escolha_count > 0:
        percentual_acerto = (total_acertos / multipla_escolha_count) * 100
        nota_final = Decimal(str(round((total_acertos / multipla_escolha_count) * 10, 2)))
    else:
        percentual_acerto = 100.0
        nota_final = Decimal("10.00")
    
    # Criar registro de nota
    db_nota = Nota(
        usuario_id=current_user.id,
        prova_id=prova_id,
        nota_final=nota_final,
        tentativa=1,  # TODO: implementar contador de tentativas
        data_submissao=datetime.utcnow()
    )
    db.add(db_nota)
    db.commit()
    
    return ProvaResultResponse(
        prova_id=prova_id,
        usuario_id=current_user.id,
        total_questoes=total_questoes,
        total_acertos=total_acertos,
        nota_final=nota_final,
        percentual_acerto=percentual_acerto,
        respostas=[RespostaResponse.model_validate(r) for r in respostas_salvas],
        data_submissao=datetime.utcnow()
    )

@router.get("/{prova_id}/respostas", response_model=list[RespostaResponse])
async def get_respostas(
    prova_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    usuario_id: int = Query(None, description="Filtrar por ID do usuário (admin only)")
):
    """
    Obter respostas de uma prova (admin vê todas, alunos veem apenas as suas).
    
    **Path Parameters:**
    - `prova_id`: ID da prova
    
    **Query Parameters:**
    - `usuario_id`: Filtrar por usuário (apenas admin pode filtrar outros)
    
    **Returns:**
    - Lista de respostas
    
    **Status Codes:**
    - 200: Sucesso
    - 403: Sem permissão
    - 404: Prova não encontrada
    """
    # Verificar prova
    prova = db.query(Prova).filter(Prova.id == prova_id).first()
    if not prova:
        raise HTTPException(status_code=404, detail=f"Prova {prova_id} não encontrada")
    
    # Buscar respostas
    query = db.query(Resposta).filter(Resposta.prova_id == prova_id)
    
    if current_user.role == "admin":
        # Admin pode filtrar por usuário ou ver todas
        if usuario_id:
            query = query.filter(Resposta.usuario_id == usuario_id)
    else:
        # Aluno só vê suas próprias respostas
        query = query.filter(Resposta.usuario_id == current_user.id)
    
    respostas = query.all()
    return respostas
