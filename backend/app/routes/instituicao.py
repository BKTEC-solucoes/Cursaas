from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path as FilePath
import time

from app.database import get_db
from decimal import Decimal
from app.models import (
    Instituicao, RoleEnum, Faculdade, FaculdadeTema, Usuario,
    VinculoAlunoFaculdade, SolicitacaoCadastro, SolicitacaoStatusEnum,
    Curso, Aula, StatusCursoEnum, Video,
    Nota, Prova, Questao, Resposta, OpcaoResposta,
)
from app.routes.auth import get_current_user
from app.routes.cadastro import _gerar_matricula
from app.schemas import (
    InstituicaoCreate, InstituicaoDetailResponse, TokenResponse,
    CursoCreate, CursoUpdate, CursoAdminResponse,
    AulaCreate, AulaUpdate, AulaResponse, AulaDetailResponse, VideoResponse,
    UsuarioCreate, UsuarioUpdate, UsuarioDetailResponse,
    NotaListResponse, NotaUpdate,
    FaculdadeTemaResponse, FaculdadeTemaUpdate,
    InstituicaoPerfilUpdate,
)
from app.services.auth_service import AuthService
from app.config import settings
from app.services.institution_registration_service import (
    InstitutionRegistrationError,
    InstitutionRegistrationService,
)

router = APIRouter(prefix="/instituicoes", tags=["Instituicoes"])


def get_current_instituicao_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    if current_user.role != RoleEnum.instituicao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso exclusivo para contas de instituição",
        )
    if not current_user.faculdade_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de instituição sem faculdade vinculada",
        )
    return current_user


def _get_faculdade(db: Session, current_user: Usuario) -> Faculdade:
    """Retorna a Faculdade vinculada ao usuário, ou 404."""
    if current_user.faculdade_id:
        f = db.query(Faculdade).filter(Faculdade.id == current_user.faculdade_id).first()
        if f:
            return f
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Nenhuma faculdade vinculada a esta conta",
    )


# ---------------------------------------------------------------------------
# GET /minha
# ---------------------------------------------------------------------------

@router.get("/minha", summary="Dados da minha instituição")
def minha_instituicao(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    """Retorna os dados da instituição vinculada ao usuário logado."""
    if current_user.faculdade_id:
        faculdade = db.query(Faculdade).filter(Faculdade.id == current_user.faculdade_id).first()
        if faculdade:
            return {
                "id": faculdade.id,
                "nome": faculdade.nome,
                "cnpj": faculdade.cnpj,
                "email_contato": faculdade.email_contato,
                "telefone": faculdade.telefone,
                "dominio_email": faculdade.dominio_email,
                "plano": faculdade.plano,
                "ativa": faculdade.ativa,
                "aprovada": faculdade.aprovada,
                "data_criacao": faculdade.data_criacao,
            }

    # Fallback: modelo legado
    if current_user.instituicao_id:
        inst = db.query(Instituicao).filter(Instituicao.id == current_user.instituicao_id).first()
        if inst:
            return {
                "id": inst.id,
                "nome": inst.nome_instituicao,
                "cnpj": inst.cnpj,
                "email_contato": None,
                "telefone": inst.contato,
                "dominio_email": None,
                "plano": None,
                "ativa": inst.ativa,
                "aprovada": inst.aprovada,
                "data_criacao": inst.data_criacao,
            }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Nenhuma instituição vinculada a esta conta",
    )


# ---------------------------------------------------------------------------
# PATCH /minha — atualizar perfil (campos públicos, sem aprovar/ativar)
# ---------------------------------------------------------------------------

@router.patch("/minha", summary="Atualizar perfil da minha instituição")
def atualizar_minha_instituicao(
    payload: InstituicaoPerfilUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(faculdade, campo, valor)

    db.commit()
    db.refresh(faculdade)
    return {
        "id": faculdade.id,
        "nome": faculdade.nome,
        "cnpj": faculdade.cnpj,
        "email_contato": faculdade.email_contato,
        "telefone": faculdade.telefone,
        "dominio_email": faculdade.dominio_email,
        "plano": faculdade.plano,
        "ativa": faculdade.ativa,
        "aprovada": faculdade.aprovada,
        "data_criacao": faculdade.data_criacao,
    }


# ---------------------------------------------------------------------------
# GET /minha/tema — tema ativo da instituição
# ---------------------------------------------------------------------------

@router.get(
    "/minha/tema",
    response_model=FaculdadeTemaResponse,
    summary="Obter tema visual da minha instituição",
)
def obter_tema_instituicao(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
) -> FaculdadeTemaResponse:
    faculdade = _get_faculdade(db, current_user)
    tema = faculdade.tema_ativo
    logo = (tema.logo_url_override if tema and tema.logo_url_override else faculdade.logo_url)
    return FaculdadeTemaResponse(
        faculdade_id      = faculdade.id,
        nome              = faculdade.nome,
        logo_url          = logo,
        primary_color     = tema.primary_color     if tema else "#1a6b3c",
        secondary_color   = tema.secondary_color   if tema else "#0f4b2a",
        background_color  = tema.background_color  if tema else "#f0fdf4",
        font_family       = tema.font_family        if tema else "Inter, system-ui, sans-serif",
        dark_mode             = tema.dark_mode             if tema else False,
        dark_primary_color    = tema.dark_primary_color    if tema else "#34d399",
        dark_secondary_color  = tema.dark_secondary_color  if tema else "#10b981",
        dark_background_color = tema.dark_background_color if tema else "#0f172a",
        favicon_url       = tema.favicon_url if tema else None,
    )


# ---------------------------------------------------------------------------
# PUT /minha/tema — atualizar tema ativo
# ---------------------------------------------------------------------------

@router.put(
    "/minha/tema",
    response_model=FaculdadeTemaResponse,
    summary="Atualizar tema visual da minha instituição",
)
def atualizar_tema_instituicao(
    payload: FaculdadeTemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
) -> FaculdadeTemaResponse:
    faculdade = _get_faculdade(db, current_user)

    tema = faculdade.tema_ativo
    if tema is None:
        tema = FaculdadeTema(faculdade_id=faculdade.id, nome="Tema Padrão")
        db.add(tema)
        db.flush()
        faculdade.tema_ativo_id = tema.id

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tema, field, value)

    db.commit()
    db.refresh(tema)
    db.refresh(faculdade)

    logo = tema.logo_url_override or faculdade.logo_url
    return FaculdadeTemaResponse(
        faculdade_id      = faculdade.id,
        nome              = faculdade.nome,
        logo_url          = logo,
        primary_color     = tema.primary_color,
        secondary_color   = tema.secondary_color,
        background_color  = tema.background_color,
        font_family       = tema.font_family,
        dark_mode             = tema.dark_mode,
        dark_primary_color    = tema.dark_primary_color,
        dark_secondary_color  = tema.dark_secondary_color,
        dark_background_color = tema.dark_background_color,
        favicon_url       = tema.favicon_url,
    )


# ---------------------------------------------------------------------------
# GET /minha/alunos — listar alunos vinculados
# ---------------------------------------------------------------------------

@router.get("/minha/alunos", summary="Listar alunos da minha instituição")
def minha_instituicao_alunos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    vinculos = (
        db.query(VinculoAlunoFaculdade, Usuario)
        .join(Usuario, Usuario.id == VinculoAlunoFaculdade.usuario_id)
        .filter(VinculoAlunoFaculdade.faculdade_id == faculdade.id)
        .all()
    )

    return [
        {
            "vinculo_id": v.id,
            "usuario_id": u.id,
            "nome": u.nome,
            "email": u.email,
            "cpf_rg": u.cpf_rg,
            "telefone": u.telefone,
            "data_nascimento": u.data_nascimento,
            "sexo": u.sexo,
            "endereco": u.endereco,
            "cep": u.cep,
            "nome_responsavel": u.nome_responsavel,
            "turma": u.turma,
            "historico_escolar": u.historico_escolar,
            "matricula": v.matricula,
            "numero_matricula": u.numero_matricula,
            "status": v.status,
            "ativo": u.ativo,
            "data_vinculo": v.data_vinculo,
        }
        for v, u in vinculos
    ]


# ---------------------------------------------------------------------------
# POST /minha/alunos — criar aluno e vinculá-lo à instituição
# ---------------------------------------------------------------------------

@router.post("/minha/alunos", status_code=status.HTTP_201_CREATED, summary="Cadastrar aluno na minha instituição")
def criar_aluno_instituicao(
    dados: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    if db.query(Usuario).filter(Usuario.email == dados.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    if dados.cpf_rg and db.query(Usuario).filter(Usuario.cpf_rg == dados.cpf_rg).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF/RG já cadastrado")

    if dados.numero_matricula and db.query(Usuario).filter(Usuario.numero_matricula == dados.numero_matricula).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Número de matrícula já cadastrado")

    novo = AuthService.create_user(
        db=db,
        email=dados.email,
        nome=dados.nome,
        senha=dados.senha,
        role="aluno",
        data_nascimento=dados.data_nascimento,
        sexo=dados.sexo,
        cpf_rg=dados.cpf_rg,
        endereco=dados.endereco,
        cep=dados.cep,
        telefone=dados.telefone,
        nome_responsavel=dados.nome_responsavel,
        numero_matricula=dados.numero_matricula,
        turma=dados.turma,
        historico_escolar=dados.historico_escolar,
        faculdade_id=faculdade.id,
    )

    vinculo = VinculoAlunoFaculdade(
        usuario_id=novo.id,
        faculdade_id=faculdade.id,
        matricula=dados.numero_matricula,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(novo)
    db.refresh(vinculo)

    return {
        "vinculo_id": vinculo.id,
        "usuario_id": novo.id,
        "nome": novo.nome,
        "email": novo.email,
        "cpf_rg": novo.cpf_rg,
        "telefone": novo.telefone,
        "data_nascimento": novo.data_nascimento,
        "sexo": novo.sexo,
        "endereco": novo.endereco,
        "cep": novo.cep,
        "nome_responsavel": novo.nome_responsavel,
        "turma": novo.turma,
        "historico_escolar": novo.historico_escolar,
        "matricula": vinculo.matricula,
        "numero_matricula": novo.numero_matricula,
        "status": vinculo.status,
        "ativo": novo.ativo,
        "data_vinculo": vinculo.data_vinculo,
    }


# ---------------------------------------------------------------------------
# PUT /minha/alunos/{usuario_id} — atualizar aluno da instituição
# ---------------------------------------------------------------------------

@router.put("/minha/alunos/{usuario_id}", summary="Atualizar aluno da minha instituição")
def atualizar_aluno_instituicao(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    vinculo = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.usuario_id == usuario_id,
        VinculoAlunoFaculdade.faculdade_id == faculdade.id,
    ).first()
    if not vinculo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado nesta instituição")

    aluno = db.query(Usuario).filter(Usuario.id == usuario_id, Usuario.role == RoleEnum.aluno).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    if dados.nome is not None:
        aluno.nome = dados.nome
    if dados.email is not None:
        conflict = db.query(Usuario).filter(Usuario.email == dados.email, Usuario.id != usuario_id).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já utilizado por outro usuário")
        aluno.email = dados.email
    if dados.ativo is not None:
        aluno.ativo = dados.ativo
    if dados.data_nascimento is not None:
        aluno.data_nascimento = dados.data_nascimento
    if dados.sexo is not None:
        aluno.sexo = dados.sexo
    if dados.cpf_rg is not None:
        dup = db.query(Usuario).filter(Usuario.cpf_rg == dados.cpf_rg, Usuario.id != usuario_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF/RG já cadastrado")
        aluno.cpf_rg = dados.cpf_rg
    if dados.endereco is not None:
        aluno.endereco = dados.endereco
    if dados.cep is not None:
        aluno.cep = dados.cep
    if dados.telefone is not None:
        aluno.telefone = dados.telefone
    if dados.nome_responsavel is not None:
        aluno.nome_responsavel = dados.nome_responsavel
    if dados.numero_matricula is not None:
        dup = db.query(Usuario).filter(Usuario.numero_matricula == dados.numero_matricula, Usuario.id != usuario_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Número de matrícula já cadastrado")
        aluno.numero_matricula = dados.numero_matricula
        vinculo.matricula = dados.numero_matricula
    if dados.turma is not None:
        aluno.turma = dados.turma
    if dados.historico_escolar is not None:
        aluno.historico_escolar = dados.historico_escolar

    db.commit()
    db.refresh(aluno)
    db.refresh(vinculo)

    return {
        "vinculo_id": vinculo.id,
        "usuario_id": aluno.id,
        "nome": aluno.nome,
        "email": aluno.email,
        "cpf_rg": aluno.cpf_rg,
        "telefone": aluno.telefone,
        "data_nascimento": aluno.data_nascimento,
        "sexo": aluno.sexo,
        "endereco": aluno.endereco,
        "cep": aluno.cep,
        "nome_responsavel": aluno.nome_responsavel,
        "turma": aluno.turma,
        "historico_escolar": aluno.historico_escolar,
        "matricula": vinculo.matricula,
        "numero_matricula": aluno.numero_matricula,
        "status": vinculo.status,
        "ativo": aluno.ativo,
        "data_vinculo": vinculo.data_vinculo,
    }


# ---------------------------------------------------------------------------
# DELETE /minha/alunos/{usuario_id} — remover aluno da instituição
# ---------------------------------------------------------------------------

@router.delete("/minha/alunos/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remover aluno da minha instituição")
def deletar_aluno_instituicao(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    vinculo = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.usuario_id == usuario_id,
        VinculoAlunoFaculdade.faculdade_id == faculdade.id,
    ).first()
    if not vinculo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado nesta instituição")

    aluno = db.query(Usuario).filter(Usuario.id == usuario_id, Usuario.role == RoleEnum.aluno).first()
    db.delete(vinculo)
    if aluno:
        db.delete(aluno)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# GET /minha/notas — listar notas da instituição
# ---------------------------------------------------------------------------

@router.get("/minha/notas", summary="Listar notas da minha instituição")
def minha_instituicao_notas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    notas = (
        db.query(Nota)
        .join(Prova, Nota.prova_id == Prova.id)
        .filter(Prova.faculdade_id == faculdade.id)
        .all()
    )

    return [
        {
            "id": n.id,
            "usuario_id": n.usuario_id,
            "prova_id": n.prova_id,
            "nota_final": float(n.nota_final) if n.nota_final is not None else None,
            "tentativa": n.tentativa,
            "observacoes": n.observacoes,
            "data_submissao": n.data_submissao,
            "data_correcao": n.data_correcao,
            "usuario_nome": n.usuario.nome if n.usuario else None,
            "prova_titulo": n.prova.titulo if n.prova else None,
        }
        for n in notas
    ]


# ---------------------------------------------------------------------------
# PUT /minha/notas/{nota_id} — atualizar nota
# ---------------------------------------------------------------------------

@router.put("/minha/notas/{nota_id}", summary="Atualizar nota de aluno da minha instituição")
def atualizar_nota_instituicao(
    nota_id: int,
    dados: NotaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    from datetime import datetime as _dt
    faculdade = _get_faculdade(db, current_user)

    nota = db.query(Nota).join(Prova, Nota.prova_id == Prova.id).filter(
        Nota.id == nota_id,
        Prova.faculdade_id == faculdade.id,
    ).first()
    if not nota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota não encontrada nesta instituição")

    if dados.nota_final is not None:
        nota.nota_final = dados.nota_final
        nota.data_correcao = _dt.utcnow()
    if dados.observacoes is not None:
        nota.observacoes = dados.observacoes

    db.commit()
    db.refresh(nota)

    return {
        "id": nota.id,
        "usuario_id": nota.usuario_id,
        "prova_id": nota.prova_id,
        "nota_final": float(nota.nota_final) if nota.nota_final is not None else None,
        "tentativa": nota.tentativa,
        "observacoes": nota.observacoes,
        "data_submissao": nota.data_submissao,
        "data_correcao": nota.data_correcao,
        "usuario_nome": nota.usuario.nome if nota.usuario else None,
        "prova_titulo": nota.prova.titulo if nota.prova else None,
    }


# ---------------------------------------------------------------------------
# GET /minha/notas/respostas/{prova_id}/{usuario_id} — ver respostas do aluno
# ---------------------------------------------------------------------------

@router.get("/minha/notas/respostas/{prova_id}/{usuario_id}", summary="Ver respostas de aluno em prova da minha instituição")
def ver_respostas_aluno_instituicao(
    prova_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    prova = db.query(Prova).filter(Prova.id == prova_id, Prova.faculdade_id == faculdade.id).first()
    if not prova:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prova não encontrada nesta instituição")

    questoes = db.query(Questao).filter(Questao.prova_id == prova_id).order_by(Questao.ordem).all()

    resultado = []
    for questao in questoes:
        resposta_aluno = db.query(Resposta).filter(
            Resposta.usuario_id == usuario_id,
            Resposta.questao_id == questao.id,
            Resposta.prova_id == prova_id,
        ).order_by(Resposta.data_resposta.desc()).first()

        if questao.tipo == "multipla_escolha":
            opcoes = db.query(OpcaoResposta).filter(
                OpcaoResposta.questao_id == questao.id
            ).order_by(OpcaoResposta.ordem).all()
            resultado.append({
                "id": questao.id,
                "enunciado": questao.enunciado,
                "tipo": questao.tipo,
                "pontos": float(questao.pontos or 1),
                "ordem": questao.ordem,
                "opcoes": [{"id": op.id, "texto": op.texto, "ordem": op.ordem, "correta": op.correta} for op in opcoes],
                "opcao_selecionada": resposta_aluno.opcao_id if resposta_aluno else None,
                "correta": resposta_aluno.correta if resposta_aluno else None,
            })
        else:
            resultado.append({
                "id": questao.id,
                "enunciado": questao.enunciado,
                "tipo": questao.tipo,
                "pontos": float(questao.pontos or 1),
                "ordem": questao.ordem,
                "texto_resposta": resposta_aluno.texto_resposta if resposta_aluno else None,
                "correta": None,
            })

    return {"questoes": resultado}


# ---------------------------------------------------------------------------
# GET /minha/solicitacoes — solicitações de cadastro da minha faculdade
# ---------------------------------------------------------------------------

@router.get("/minha/solicitacoes", summary="Solicitações de cadastro da minha instituição")
def minha_instituicao_solicitacoes(
    status_filtro: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    query = (
        db.query(SolicitacaoCadastro)
        .filter(SolicitacaoCadastro.faculdade_id == faculdade.id)
        .order_by(SolicitacaoCadastro.criado_em.desc())
    )

    if status_filtro:
        try:
            query = query.filter(SolicitacaoCadastro.status == SolicitacaoStatusEnum(status_filtro))
        except ValueError:
            pass

    solicitacoes = query.all()
    return [
        {
            "id": s.id,
            "nome": s.nome,
            "email": s.email,
            "telefone": s.telefone,
            "cpf_rg": s.cpf_rg,
            "mensagem": s.mensagem,
            "status": s.status,
            "motivo_recusa": s.motivo_recusa,
            "criado_em": s.criado_em,
            "revisado_em": s.revisado_em,
        }
        for s in solicitacoes
    ]


# ---------------------------------------------------------------------------
# PATCH /minha/solicitacoes/{id}/aprovar
# ---------------------------------------------------------------------------

@router.patch("/minha/solicitacoes/{solicitacao_id}/aprovar", summary="Aprovar solicitação de cadastro")
def aprovar_solicitacao_instituicao(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    from datetime import datetime
    from sqlalchemy import func

    faculdade = _get_faculdade(db, current_user)

    s = db.query(SolicitacaoCadastro).filter(
        SolicitacaoCadastro.id == solicitacao_id,
        SolicitacaoCadastro.faculdade_id == faculdade.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if s.status != SolicitacaoStatusEnum.pendente:
        raise HTTPException(status_code=409, detail=f"Solicitação já foi {s.status.value}")

    # Caso: usuário já criado via /auth/registro
    if s.usuario_id is not None:
        usuario_existente = db.query(Usuario).filter(Usuario.id == s.usuario_id).first()
        if not usuario_existente:
            raise HTTPException(status_code=409, detail="Usuário referenciado não encontrado")

        vinculo_existente = db.query(VinculoAlunoFaculdade).filter(
            VinculoAlunoFaculdade.usuario_id == s.usuario_id,
            VinculoAlunoFaculdade.faculdade_id == s.faculdade_id,
        ).first()
        if not vinculo_existente:
            matricula = _gerar_matricula(s.faculdade_id, db)
            db.add(VinculoAlunoFaculdade(
                usuario_id=s.usuario_id,
                faculdade_id=s.faculdade_id,
                matricula=matricula,
            ))
            usuario_existente.numero_matricula = matricula

        s.status = SolicitacaoStatusEnum.aprovada
        s.revisado_em = datetime.utcnow()
        db.commit()
        db.refresh(s)
        return {"id": s.id, "status": s.status, "revisado_em": s.revisado_em}

    # Caso: solicitação pública — criar usuário
    email_existente = db.query(Usuario).filter(
        func.lower(Usuario.email) == s.email.lower()
    ).first()
    if email_existente:
        raise HTTPException(status_code=409, detail="E-mail já possui usuário cadastrado")

    matricula = _gerar_matricula(s.faculdade_id, db)
    import secrets, string
    alfabeto = string.ascii_letters + string.digits + "!@#$%"
    while True:
        senha_temp = "".join(secrets.choice(alfabeto) for _ in range(12))
        if (any(c.isupper() for c in senha_temp) and any(c.islower() for c in senha_temp)
                and any(c.isdigit() for c in senha_temp) and any(c in "!@#$%" for c in senha_temp)):
            break

    novo_usuario = Usuario(
        nome=s.nome,
        email=s.email,
        senha=AuthService.hash_password(senha_temp),
        role=RoleEnum.aluno,
        telefone=s.telefone,
        cpf_rg=s.cpf_rg,
        faculdade_id=s.faculdade_id,
        numero_matricula=matricula,
        ativo=True,
    )
    db.add(novo_usuario)
    db.flush()

    db.add(VinculoAlunoFaculdade(
        usuario_id=novo_usuario.id,
        faculdade_id=s.faculdade_id,
        matricula=matricula,
    ))

    s.status = SolicitacaoStatusEnum.aprovada
    s.usuario_id = novo_usuario.id
    s.revisado_em = datetime.utcnow()

    db.commit()
    db.refresh(s)
    return {"id": s.id, "status": s.status, "revisado_em": s.revisado_em}


# ---------------------------------------------------------------------------
# PATCH /minha/solicitacoes/{id}/recusar
# ---------------------------------------------------------------------------

@router.patch("/minha/solicitacoes/{solicitacao_id}/recusar", summary="Recusar solicitação de cadastro")
def recusar_solicitacao_instituicao(
    solicitacao_id: int,
    motivo: str = Query(..., min_length=5, max_length=500, description="Motivo da recusa"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    from datetime import datetime

    faculdade = _get_faculdade(db, current_user)

    s = db.query(SolicitacaoCadastro).filter(
        SolicitacaoCadastro.id == solicitacao_id,
        SolicitacaoCadastro.faculdade_id == faculdade.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if s.status != SolicitacaoStatusEnum.pendente:
        raise HTTPException(status_code=409, detail=f"Solicitação já foi {s.status.value}")

    s.status = SolicitacaoStatusEnum.recusada
    s.motivo_recusa = motivo.strip()
    s.revisado_em = datetime.utcnow()

    db.commit()
    db.refresh(s)
    return {"id": s.id, "status": s.status, "revisado_em": s.revisado_em}


# ---------------------------------------------------------------------------
# Helpers internos para cursos
# ---------------------------------------------------------------------------

def _normalize_course_price(pago: bool, valor) -> Decimal | None:
    if not pago:
        return None
    if valor is None or Decimal(str(valor)) <= 0:
        return Decimal("0.0")
    return Decimal(str(valor))


def _ensure_course_belongs_to_faculdade(db: Session, curso_id: int, faculdade_id: int) -> Curso:
    curso = db.query(Curso).filter(Curso.id == curso_id, Curso.faculdade_id == faculdade_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso não encontrado ou não pertence à sua instituição",
        )
    return curso


# ---------------------------------------------------------------------------
# GET /minha/cursos — listar cursos da instituição
# ---------------------------------------------------------------------------

@router.get("/minha/cursos", response_model=list[CursoAdminResponse], summary="Listar cursos da minha instituição")
def minha_instituicao_cursos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    cursos = (
        db.query(Curso)
        .filter(Curso.faculdade_id == faculdade.id)
        .order_by(Curso.data_criacao.desc())
        .all()
    )
    return [CursoAdminResponse.model_validate(c) for c in cursos]


# ---------------------------------------------------------------------------
# POST /minha/cursos — criar curso para a instituição
# ---------------------------------------------------------------------------

@router.post("/minha/cursos", response_model=CursoAdminResponse, status_code=status.HTTP_201_CREATED, summary="Criar curso para a minha instituição")
def criar_curso_instituicao(
    curso_data: CursoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    existing = db.query(Curso).filter(
        Curso.nome == curso_data.nome,
        Curso.faculdade_id == faculdade.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um curso com o nome '{curso_data.nome}' nesta instituição",
        )

    valor = _normalize_course_price(curso_data.pago, curso_data.valor)
    initial_status = StatusCursoEnum.pendente if curso_data.pago else StatusCursoEnum.aprovado

    db_curso = Curso(
        nome=curso_data.nome,
        descricao=curso_data.descricao,
        pago=curso_data.pago,
        valor=valor,
        status=initial_status,
        percentual_presenca_minima=curso_data.percentual_presenca_minima,
        ativo=True,
        faculdade_id=faculdade.id,
        criado_por_id=current_user.id,
    )
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)
    return CursoAdminResponse.model_validate(db_curso)


# ---------------------------------------------------------------------------
# PUT /minha/cursos/{curso_id} — editar curso da instituição
# ---------------------------------------------------------------------------

@router.put("/minha/cursos/{curso_id}", response_model=CursoAdminResponse, summary="Editar curso da minha instituição")
def editar_curso_instituicao(
    curso_id: int,
    curso_data: CursoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    curso = _ensure_course_belongs_to_faculdade(db, curso_id, faculdade.id)

    update_data = curso_data.model_dump(exclude_unset=True)
    pago_final = update_data.get("pago", curso.pago)
    valor_final = update_data.get("valor", curso.valor)
    update_data["valor"] = _normalize_course_price(pago_final, valor_final)

    if "nome" in update_data and update_data["nome"] != curso.nome:
        existing = db.query(Curso).filter(
            Curso.nome == update_data["nome"],
            Curso.faculdade_id == faculdade.id,
            Curso.id != curso_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe outro curso com o nome '{update_data['nome']}' nesta instituição",
            )

    for campo, valor in update_data.items():
        setattr(curso, campo, valor)

    db.commit()
    db.refresh(curso)
    return CursoAdminResponse.model_validate(curso)


# ---------------------------------------------------------------------------
# DELETE /minha/cursos/{curso_id} — excluir curso da instituição
# ---------------------------------------------------------------------------

@router.delete("/minha/cursos/{curso_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir curso da minha instituição")
def excluir_curso_instituicao(
    curso_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    curso = _ensure_course_belongs_to_faculdade(db, curso_id, faculdade.id)
    db.delete(curso)
    db.commit()


# ---------------------------------------------------------------------------
# POST /minha/cursos/{curso_id}/aulas — criar aula em um curso da instituição
# ---------------------------------------------------------------------------

@router.post("/minha/cursos/{curso_id}/aulas", response_model=AulaResponse, status_code=status.HTTP_201_CREATED, summary="Criar aula em curso da minha instituição")
def criar_aula_curso_instituicao(
    curso_id: int,
    aula_data: AulaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    _ensure_course_belongs_to_faculdade(db, curso_id, faculdade.id)

    db_aula = Aula(
        curso_id=curso_id,
        titulo=aula_data.titulo,
        descricao=aula_data.descricao,
        data_aula=aula_data.data_aula,
        duracao_minutos=aula_data.duracao_minutos,
        ativo=True,
    )
    db.add(db_aula)
    db.commit()
    db.refresh(db_aula)
    return AulaResponse.model_validate(db_aula)


# ---------------------------------------------------------------------------
# Helpers internos para aulas
# ---------------------------------------------------------------------------

def _ensure_aula_belongs_to_faculdade(db: Session, aula_id: int, faculdade_id: int) -> Aula:
    aula = (
        db.query(Aula)
        .join(Curso, Aula.curso_id == Curso.id)
        .filter(Aula.id == aula_id, Curso.faculdade_id == faculdade_id)
        .first()
    )
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aula não encontrada ou não pertence à sua instituição",
        )
    return aula


# ---------------------------------------------------------------------------
# GET /minha/aulas — listar aulas de todos os cursos da instituição
# ---------------------------------------------------------------------------

@router.get("/minha/aulas", response_model=list[AulaDetailResponse], summary="Listar aulas da minha instituição")
def minha_instituicao_aulas(
    curso_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)

    query = (
        db.query(Aula)
        .join(Curso, Aula.curso_id == Curso.id)
        .filter(Curso.faculdade_id == faculdade.id)
    )
    if curso_id:
        query = query.filter(Aula.curso_id == curso_id)

    aulas = query.order_by(Aula.data_aula).all()
    return [AulaDetailResponse.model_validate(a) for a in aulas]


# ---------------------------------------------------------------------------
# GET /minha/aulas/{aula_id} — detalhe de uma aula
# ---------------------------------------------------------------------------

@router.get("/minha/aulas/{aula_id}", response_model=AulaDetailResponse, summary="Detalhe de aula da minha instituição")
def minha_instituicao_aula_detalhe(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    aula = _ensure_aula_belongs_to_faculdade(db, aula_id, faculdade.id)
    return AulaDetailResponse.model_validate(aula)


# ---------------------------------------------------------------------------
# PUT /minha/aulas/{aula_id} — editar aula
# ---------------------------------------------------------------------------

@router.put("/minha/aulas/{aula_id}", response_model=AulaResponse, summary="Editar aula da minha instituição")
def editar_aula_instituicao(
    aula_id: int,
    aula_data: AulaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    aula = _ensure_aula_belongs_to_faculdade(db, aula_id, faculdade.id)

    update_data = aula_data.model_dump(exclude_unset=True)
    for campo, valor in update_data.items():
        setattr(aula, campo, valor)

    db.commit()
    db.refresh(aula)
    return AulaResponse.model_validate(aula)


# ---------------------------------------------------------------------------
# DELETE /minha/aulas/{aula_id} — excluir aula
# ---------------------------------------------------------------------------

@router.delete("/minha/aulas/{aula_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir aula da minha instituição")
def excluir_aula_instituicao(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    aula = _ensure_aula_belongs_to_faculdade(db, aula_id, faculdade.id)
    db.delete(aula)
    db.commit()


# ---------------------------------------------------------------------------
# POST /minha/aulas/{aula_id}/upload-video — upload de vídeo para uma aula
# ---------------------------------------------------------------------------

@router.post("/minha/aulas/{aula_id}/upload-video", response_model=VideoResponse, status_code=status.HTTP_201_CREATED, summary="Upload de vídeo para aula da minha instituição")
def upload_video_instituicao(
    aula_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    _ensure_aula_belongs_to_faculdade(db, aula_id, faculdade.id)

    aula = db.query(Aula).filter(Aula.id == aula_id).first()

    allowed_formats = settings.ALLOWED_VIDEO_FORMATS
    file_extension = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_extension not in allowed_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato não suportado. Permitidos: {', '.join(allowed_formats)}",
        )

    # Remover vídeo anterior
    video_anterior = db.query(Video).filter(Video.aula_id == aula_id).first()
    if video_anterior:
        try:
            os.remove(video_anterior.caminho_arquivo)
        except Exception:
            pass
        db.delete(video_anterior)
        db.commit()

    upload_dir = FilePath(settings.UPLOAD_DIR) / "videos"
    upload_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time() * 1000)
    filename = f"aula_{aula_id}_video_{timestamp}.{file_extension}"
    filepath = upload_dir / filename

    with open(filepath, "wb") as f:
        content = file.file.read()
        f.write(content)
        file_size = len(content)

    db_video = Video(
        aula_id=aula_id,
        arquivo_nome=file.filename,
        caminho_arquivo=str(filepath),
        tamanho_bytes=file_size,
        formato=file_extension,
        status="ativo",
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return VideoResponse.model_validate(db_video)


# ---------------------------------------------------------------------------
# DELETE /minha/aulas/{aula_id}/video/{video_id} — excluir vídeo da aula
# ---------------------------------------------------------------------------

@router.delete("/minha/aulas/{aula_id}/video/{video_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir vídeo de aula da minha instituição")
def excluir_video_instituicao(
    aula_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_instituicao_user),
):
    faculdade = _get_faculdade(db, current_user)
    _ensure_aula_belongs_to_faculdade(db, aula_id, faculdade.id)

    video = db.query(Video).filter(Video.id == video_id, Video.aula_id == aula_id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vídeo não encontrado")

    try:
        if os.path.exists(video.caminho_arquivo):
            os.remove(video.caminho_arquivo)
    except Exception:
        pass

    db.delete(video)
    db.commit()


@router.post("/registrar", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def registrar_instituicao(
    dados: InstituicaoCreate,
    db: Session = Depends(get_db),
):
    service = InstitutionRegistrationService(db)

    try:
        return await service.register(dados)
    except InstitutionRegistrationError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.get("/{instituicao_id:int}", response_model=InstituicaoDetailResponse)
async def obter_instituicao(
    instituicao_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
):
    instituicao = db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()

    if not instituicao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instituicao nao encontrada",
        )

    return instituicao
