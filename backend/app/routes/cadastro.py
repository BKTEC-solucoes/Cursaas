from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
import secrets
import string

from app.database import get_db
from app.models import SolicitacaoCadastro, SolicitacaoStatusEnum, Faculdade, Usuario, VinculoAlunoFaculdade, RoleEnum
from app.routes.auth import get_current_super_admin
from app.services.auth_service import AuthService
from app.schemas import (
    SolicitacaoCadastroCreate,
    SolicitacaoCadastroResponse,
    SolicitacaoCadastroAdminResponse,
)

router = APIRouter()


@router.post(
    "/",
    response_model=SolicitacaoCadastroResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Auto-cadastro público",
    description=(
        "Endpoint público — não requer autenticação. "
        "Cria uma solicitação com status **pendente**. "
        "Nenhum usuário é criado neste momento. "
        "Um super admin deve aprovar a solicitação para que o aluno seja criado."
    ),
)
def solicitar_cadastro(
    dados: SolicitacaoCadastroCreate,
    db: Session = Depends(get_db),
):
    """
    **Request body:**
    ```json
    {
      "nome": "Maria Silva",
      "email": "maria@email.com",
      "faculdade_id": 1,
      "telefone": "11999990000",   // opcional
      "cpf_rg": "123.456.789-00",  // opcional
      "mensagem": "Quero ingressar no curso de Direito"  // opcional
    }
    ```

    **Erros possíveis:**
    - `404` — faculdade não encontrada ou inativa
    - `409` — já existe solicitação pendente/aprovada para este email nesta faculdade
    """

    # 1. Verificar se a faculdade existe e está ativa
    faculdade = db.query(Faculdade).filter(
        Faculdade.id == dados.faculdade_id,
        Faculdade.ativa == True,
    ).first()
    if not faculdade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculdade não encontrada ou inativa",
        )

    # 2. Verificar email duplicado na mesma faculdade
    #    Bloqueamos pendente E aprovada — só recusada permite tentar de novo
    email_normalizado = dados.email.strip().lower()
    conflito = db.query(SolicitacaoCadastro).filter(
        func.lower(SolicitacaoCadastro.email) == email_normalizado,
        SolicitacaoCadastro.faculdade_id == dados.faculdade_id,
        SolicitacaoCadastro.status.in_([
            SolicitacaoStatusEnum.pendente,
            SolicitacaoStatusEnum.aprovada,
        ]),
    ).first()
    if conflito:
        if conflito.status == SolicitacaoStatusEnum.aprovada:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este e-mail já possui cadastro aprovado nesta faculdade",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma solicitação pendente para este e-mail nesta faculdade",
        )

    # 3. Criar solicitação — status 'pendente', SEM criar usuário
    solicitacao = SolicitacaoCadastro(
        nome=dados.nome.strip(),
        email=email_normalizado,
        telefone=dados.telefone,
        cpf_rg=dados.cpf_rg,
        mensagem=dados.mensagem,
        faculdade_id=dados.faculdade_id,
        status=SolicitacaoStatusEnum.pendente,
    )
    db.add(solicitacao)
    db.commit()
    db.refresh(solicitacao)

    return solicitacao


# =============================================================================
# Endpoints de Admin (apenas super_admin)
# =============================================================================

def _enrich(s: SolicitacaoCadastro) -> SolicitacaoCadastroAdminResponse:
    """Monta o response enriquecido com o nome da faculdade."""
    data = SolicitacaoCadastroAdminResponse.model_validate(s)
    if s.faculdade:
        data.faculdade_nome = s.faculdade.nome
    return data


@router.get(
    "/admin/pendentes",
    response_model=list[SolicitacaoCadastroAdminResponse],
    summary="Listar solicitações pendentes",
    description="Retorna todas as solicitações com status **pendente**, ordenadas da mais antiga para a mais nova. Requer super_admin.",
)
def listar_pendentes(
    faculdade_id: Optional[int] = Query(None, description="Filtrar por faculdade específica"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    """
    **Response `200`:**
    ```json
    [
      {
        "id": 7,
        "nome": "Maria Silva",
        "email": "maria@email.com",
        "telefone": "11999990000",
        "cpf_rg": "123.456.789-00",
        "mensagem": "Quero ingressar no curso de Direito",
        "faculdade_id": 1,
        "faculdade_nome": "Faculdade Padrão",
        "status": "pendente",
        "motivo_recusa": null,
        "usuario_id": null,
        "criado_em": "2026-04-08T15:30:00",
        "revisado_em": null,
        "revisado_por_id": null
      }
    ]
    ```
    """
    query = (
        db.query(SolicitacaoCadastro)
        .filter(SolicitacaoCadastro.status == SolicitacaoStatusEnum.pendente)
        .order_by(SolicitacaoCadastro.criado_em.asc())  # mais antigas primeiro
    )

    if faculdade_id is not None:
        query = query.filter(SolicitacaoCadastro.faculdade_id == faculdade_id)

    solicitacoes = query.all()
    return [_enrich(s) for s in solicitacoes]


@router.get(
    "/admin/todas",
    response_model=list[SolicitacaoCadastroAdminResponse],
    summary="Listar todas as solicitações",
    description="Retorna todas as solicitações independente do status. Suporta filtro por `status` e `faculdade_id`. Requer super_admin.",
)
def listar_todas(
    status_filtro: Optional[str] = Query(None, alias="status", description="pendente | aprovada | recusada"),
    faculdade_id:  Optional[int] = Query(None, description="Filtrar por faculdade"),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    query = (
        db.query(SolicitacaoCadastro)
        .order_by(SolicitacaoCadastro.criado_em.desc())
    )

    if status_filtro:
        try:
            status_enum = SolicitacaoStatusEnum(status_filtro)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Status inválido. Use: pendente, aprovada ou recusada",
            )
        query = query.filter(SolicitacaoCadastro.status == status_enum)

    if faculdade_id is not None:
        query = query.filter(SolicitacaoCadastro.faculdade_id == faculdade_id)

    return [_enrich(s) for s in query.all()]


@router.get(
    "/admin/{solicitacao_id}",
    response_model=SolicitacaoCadastroAdminResponse,
    summary="Detalhe de uma solicitação",
)
def detalhe_solicitacao(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    s = db.query(SolicitacaoCadastro).filter(SolicitacaoCadastro.id == solicitacao_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    return _enrich(s)


# =============================================================================
# Helpers internos de aprovação
# =============================================================================

def _gerar_matricula(faculdade_id: int, db: Session) -> str:
    """
    Gera matrícula única no formato FAC<faculdade_id>-<ANO>-<6 dígitos aleatórios>.
    Faz até 5 tentativas antes de desistir.
    """
    ano = datetime.utcnow().year
    for _ in range(5):
        sufixo = "".join(secrets.choice(string.digits) for _ in range(6))
        matricula = f"FAC{faculdade_id}-{ano}-{sufixo}"
        existe = db.query(Usuario).filter(Usuario.numero_matricula == matricula).first()
        if not existe:
            return matricula
    raise RuntimeError("Não foi possível gerar uma matrícula única após 5 tentativas")


def _gerar_senha_temporaria() -> str:
    """
    Gera senha temporária de 12 caracteres com letras, dígitos e símbolo.
    Garante ao menos: 1 maiúscula, 1 minúscula, 1 dígito, 1 símbolo.
    """
    alfabeto = string.ascii_letters + string.digits + "!@#$%"
    while True:
        senha = "".join(secrets.choice(alfabeto) for _ in range(12))
        if (
            any(c.isupper() for c in senha)
            and any(c.islower() for c in senha)
            and any(c.isdigit() for c in senha)
            and any(c in "!@#$%" for c in senha)
        ):
            return senha


def _get_solicitacao_pendente(solicitacao_id: int, db: Session) -> SolicitacaoCadastro:
    s = db.query(SolicitacaoCadastro).filter(SolicitacaoCadastro.id == solicitacao_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if s.status != SolicitacaoStatusEnum.pendente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solicitação já foi {s.status.value} — não pode ser alterada",
        )
    return s


# =============================================================================
# Aprovar solicitação
# =============================================================================

@router.patch(
    "/admin/{solicitacao_id}/aprovar",
    response_model=SolicitacaoCadastroAdminResponse,
    summary="Aprovar solicitação e criar aluno",
    description=(
        "Aprova a solicitação pendente. "
        "Cria o aluno em `usuarios`, gera matrícula e senha temporária, "
        "cria vínculo em `vinculos_aluno_faculdade` e marca a solicitação como **aprovada**. "
        "Requer super_admin."
    ),
)
def aprovar_solicitacao(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_super_admin),
):
    """
    **Response `200`** — solicitação aprovada com `usuario_id` preenchido:
    ```json
    {
      "id": 7,
      "status": "aprovada",
      "usuario_id": 42,
      "revisado_por_id": 1,
      "revisado_em": "2026-04-08T16:00:00",
      ...
    }
    ```

    **Erros:**
    - `404` — solicitação não encontrada
    - `409` — solicitação já aprovada ou recusada
    - `409` — e-mail já cadastrado em `usuarios`
    """
    s = _get_solicitacao_pendente(solicitacao_id, db)

    # — Caso A: usuário criado diretamente via POST /auth/registro —
    #   O usuario_id já está preenchido na solicitação. Basta criar o vínculo.
    if s.usuario_id is not None:
        usuario_existente = db.query(Usuario).filter(Usuario.id == s.usuario_id).first()
        if not usuario_existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Usuário referenciado na solicitação não encontrado",
            )

        # Verificar se já existe vínculo ativo
        vinculo_existente = db.query(VinculoAlunoFaculdade).filter(
            VinculoAlunoFaculdade.usuario_id == s.usuario_id,
            VinculoAlunoFaculdade.faculdade_id == s.faculdade_id,
        ).first()

        if not vinculo_existente:
            matricula = _gerar_matricula(s.faculdade_id, db)
            vinculo = VinculoAlunoFaculdade(
                usuario_id=s.usuario_id,
                faculdade_id=s.faculdade_id,
                matricula=matricula,
            )
            db.add(vinculo)
            # Atualizar matrícula do usuário
            usuario_existente.numero_matricula = matricula

        s.status          = SolicitacaoStatusEnum.aprovada
        s.revisado_por_id = admin.id
        s.revisado_em     = datetime.utcnow()

        db.commit()
        db.refresh(s)
        return _enrich(s)

    # — Caso B: solicitação via formulário público (sem usuário pré-criado) —
    # Garantir que o e-mail ainda não existe em usuarios
    email_existente = db.query(Usuario).filter(
        func.lower(Usuario.email) == s.email.lower()
    ).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já possui um usuário cadastrado no sistema",
        )

    # 1. Gerar credenciais
    matricula   = _gerar_matricula(s.faculdade_id, db)
    senha_temp  = _gerar_senha_temporaria()

    # 2. Criar o usuário real (aluno)
    #    AuthService.create_user faz commit internamente — usamos flush + criação manual
    #    para manter tudo na mesma transação atômica.
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
    db.flush()  # obtém novo_usuario.id antes do commit

    # 3. Criar vínculo aluno ↔ faculdade
    vinculo = VinculoAlunoFaculdade(
        usuario_id=novo_usuario.id,
        faculdade_id=s.faculdade_id,
        matricula=matricula,
    )
    db.add(vinculo)

    # 4. Marcar solicitação como aprovada
    s.status          = SolicitacaoStatusEnum.aprovada
    s.usuario_id      = novo_usuario.id
    s.revisado_por_id = admin.id
    s.revisado_em     = datetime.utcnow()

    db.commit()
    db.refresh(s)

    # 5. TODO: enviar email com login, senha_temp e matricula
    #    enviar_email_boas_vindas(s.email, s.nome, matricula, senha_temp)

    return _enrich(s)


# =============================================================================
# Recusar solicitação
# =============================================================================

@router.patch(
    "/admin/{solicitacao_id}/recusar",
    response_model=SolicitacaoCadastroAdminResponse,
    summary="Recusar solicitação",
    description="Recusa a solicitação pendente com um motivo obrigatório. Requer super_admin.",
)
def recusar_solicitacao(
    solicitacao_id: int,
    motivo: str = Query(..., min_length=5, max_length=500, description="Motivo da recusa — obrigatório"),
    db: Session = Depends(get_db),
    admin: Usuario = Depends(get_current_super_admin),
):
    """
    **Exemplo:**
    ```
    PATCH /api/cadastro/admin/7/recusar?motivo=Documentação+incompleta
    ```
    """
    s = _get_solicitacao_pendente(solicitacao_id, db)

    s.status          = SolicitacaoStatusEnum.recusada
    s.motivo_recusa   = motivo.strip()
    s.revisado_por_id = admin.id
    s.revisado_em     = datetime.utcnow()

    db.commit()
    db.refresh(s)

    return _enrich(s)

