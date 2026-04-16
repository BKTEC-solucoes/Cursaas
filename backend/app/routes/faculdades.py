from math import ceil
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Faculdade, FaculdadeTema, TemaPreset, VinculoAlunoFaculdade, Usuario, RoleEnum
from app.routes.auth import get_current_super_admin, get_current_user
from app.schemas import (
    FaculdadeCreate,
    FaculdadeUpdate,
    FaculdadeResponse,
    FaculdadeTemaResponse,
    FaculdadeTemaCreate,
    FaculdadeTemaUpdate,
    FaculdadeTemaListItem,
    TemaPresetResponse,
    FaculdadePageResponse,
    VinculoCreate,
    VinculoUpdate,
    VinculoResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Endpoint público (sem autenticação)
# ---------------------------------------------------------------------------

@router.get(
    "/publicas",
    summary="Listar faculdades ativas (público)",
    description="Retorna id e nome de todas as faculdades ativas. Usado no formulário de cadastro de aluno.",
)
def listar_faculdades_publicas(db: Session = Depends(get_db)):
    faculdades = (
        db.query(Faculdade.id, Faculdade.nome)
        .filter(Faculdade.ativa == True)
        .order_by(Faculdade.nome)
        .all()
    )
    return [{"id": f.id, "nome": f.nome} for f in faculdades]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _get_or_404(db: Session, faculdade_id: int) -> Faculdade:
    f = db.query(Faculdade).filter(Faculdade.id == faculdade_id).first()
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Faculdade não encontrada")
    return f


# ---------------------------------------------------------------------------
# CRUD de Faculdades (apenas super_admin)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=FaculdadePageResponse,
    summary="Listar faculdades",
)
def listar_faculdades(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    ativa: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    q = db.query(Faculdade)
    if ativa is not None:
        q = q.filter(Faculdade.ativa == ativa)
    total = q.count()
    items = q.order_by(Faculdade.nome).offset((page - 1) * limit).limit(limit).all()
    return FaculdadePageResponse(
        items=[FaculdadeResponse.model_validate(f) for f in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=ceil(total / limit) if total else 0,
    )


@router.get(
    "/presets",
    response_model=List[TemaPresetResponse],
    summary="Listar presets de tema (público)",
)
def listar_presets(db: Session = Depends(get_db)):
    return db.query(TemaPreset).order_by(TemaPreset.id).all()


@router.post(
    "/",
    response_model=FaculdadeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar faculdade",
)
def criar_faculdade(
    payload: FaculdadeCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    if db.query(Faculdade).filter(Faculdade.slug == payload.slug).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug já em uso")
    if payload.cnpj and db.query(Faculdade).filter(Faculdade.cnpj == payload.cnpj).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ já cadastrado")

    f = Faculdade(**payload.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return FaculdadeResponse.model_validate(f)


@router.get(
    "/{faculdade_id}",
    response_model=FaculdadeResponse,
    summary="Detalhe da faculdade",
)
def detalhe_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    return FaculdadeResponse.model_validate(_get_or_404(db, faculdade_id))


@router.patch(
    "/{faculdade_id}",
    response_model=FaculdadeResponse,
    summary="Atualizar faculdade",
)
def atualizar_faculdade(
    faculdade_id: int,
    payload: FaculdadeUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    f = _get_or_404(db, faculdade_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(f, field, value)
    db.commit()
    db.refresh(f)
    return FaculdadeResponse.model_validate(f)


@router.delete(
    "/{faculdade_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desativar faculdade (soft delete)",
)
def desativar_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_super_admin),
):
    f = _get_or_404(db, faculdade_id)
    f.ativa = False
    db.commit()


# ---------------------------------------------------------------------------
# Vínculos de alunos (admin da faculdade ou super_admin)
# ---------------------------------------------------------------------------

@router.get(
    "/{faculdade_id}/alunos",
    response_model=list[VinculoResponse],
    summary="Listar alunos vinculados à faculdade",
)
def listar_alunos_faculdade(
    faculdade_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    _get_or_404(db, faculdade_id)
    vinculos = (
        db.query(VinculoAlunoFaculdade)
        .filter(VinculoAlunoFaculdade.faculdade_id == faculdade_id)
        .all()
    )
    return [VinculoResponse.model_validate(v) for v in vinculos]


@router.post(
    "/{faculdade_id}/alunos",
    response_model=VinculoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vincular aluno à faculdade",
)
def vincular_aluno(
    faculdade_id: int,
    payload: VinculoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    _get_or_404(db, faculdade_id)

    aluno = db.query(Usuario).filter(
        Usuario.id == payload.usuario_id, Usuario.role == RoleEnum.aluno
    ).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    existente = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.usuario_id == payload.usuario_id,
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aluno já vinculado a esta faculdade")

    v = VinculoAlunoFaculdade(
        usuario_id=payload.usuario_id,
        faculdade_id=faculdade_id,
        matricula=payload.matricula,
    )
    # Atualiza faculdade_id no usuário
    aluno.faculdade_id = faculdade_id
    db.add(v)
    db.commit()
    db.refresh(v)
    return VinculoResponse.model_validate(v)


@router.patch(
    "/{faculdade_id}/alunos/{usuario_id}",
    response_model=VinculoResponse,
    summary="Atualizar vínculo do aluno",
)
def atualizar_vinculo(
    faculdade_id: int,
    usuario_id: int,
    payload: VinculoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    v = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
        VinculoAlunoFaculdade.usuario_id == usuario_id,
    ).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(v, field, value)
    db.commit()
    db.refresh(v)
    return VinculoResponse.model_validate(v)


@router.delete(
    "/{faculdade_id}/alunos/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Desvincular aluno da faculdade",
)
def desvincular_aluno(
    faculdade_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _guard_tenant(current_user, faculdade_id)
    v = db.query(VinculoAlunoFaculdade).filter(
        VinculoAlunoFaculdade.faculdade_id == faculdade_id,
        VinculoAlunoFaculdade.usuario_id == usuario_id,
    ).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vínculo não encontrado")
    db.delete(v)
    db.commit()


# ---------------------------------------------------------------------------
# helper de guarda de tenant
# ---------------------------------------------------------------------------

def _guard_tenant(user: Usuario, faculdade_id: int) -> None:
    """Permite acesso apenas se o usuário pertence ao tenant ou é super_admin."""
    from app.models import AdminRoleEnum as ModelAdminRoleEnum
    if user.admin_role == ModelAdminRoleEnum.super_admin:
        return
    if user.faculdade_id != faculdade_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: você não pertence a esta faculdade",
        )


# ---------------------------------------------------------------------------
# White-label: helpers
# ---------------------------------------------------------------------------

def _ensure_faculdade(db: Session, user: Usuario) -> Faculdade:
    """Retorna a Faculdade do usuário, criando uma nova se ainda não existir.
    Isso cobre usuários de instituição criados antes da migração multi-tenant.
    """
    import re, unicodedata
    from app.models import Instituicao

    if user.faculdade_id:
        return _get_or_404(db, user.faculdade_id)

    # Tenta obter dados da Instituicao legada para nomear a Faculdade
    inst = db.query(Instituicao).filter(Instituicao.id == user.instituicao_id).first() if user.instituicao_id else None
    nome = inst.nome_instituicao if inst else (user.nome or f"Instituição {user.id}")
    cnpj = inst.cnpj if inst else None
    email = inst.contato if inst else user.email

    # Gera slug único
    def _slug(texto: str) -> str:
        s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
        return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

    slug_base = _slug(nome)
    slug = slug_base
    counter = 2
    while db.query(Faculdade).filter(Faculdade.slug == slug).first():
        slug = f"{slug_base}-{counter}"
        counter += 1

    faculdade = Faculdade(
        nome=nome,
        slug=slug,
        cnpj=cnpj,
        email_contato=email,
        ativa=True,
        aprovada=True,
    )
    db.add(faculdade)
    db.flush()

    user.faculdade_id = faculdade.id
    db.flush()

    return faculdade

def _build_tema_response(f: Faculdade, t: Optional[FaculdadeTema]) -> FaculdadeTemaResponse:
    """Monta FaculdadeTemaResponse a partir da faculdade e seu tema ativo."""
    logo = (t.logo_url_override if t and t.logo_url_override else f.logo_url)
    return FaculdadeTemaResponse(
        faculdade_id      = f.id,
        nome              = f.nome,
        logo_url          = logo,
        primary_color     = t.primary_color    if t else '#1a6b3c',
        secondary_color   = t.secondary_color  if t else '#0f4b2a',
        background_color  = t.background_color if t else '#f0fdf4',
        font_family       = t.font_family      if t else 'Inter, system-ui, sans-serif',
        dark_mode             = t.dark_mode             if t else False,
        dark_primary_color    = t.dark_primary_color    if t else '#34d399',
        dark_secondary_color  = t.dark_secondary_color  if t else '#10b981',
        dark_background_color = t.dark_background_color if t else '#0f172a',
        favicon_url       = t.favicon_url if t else None,
        border_radius     = t.border_radius    if t else '8px',
        spacing           = t.spacing          if t else 'comfortable',
        button_style      = t.button_style     if t else 'rounded',
        shadow_level      = t.shadow_level     if t else 'soft',
        layout_type       = t.layout_type      if t else 'topbar',
        gradient_enabled  = t.gradient_enabled if t else False,
        page_overrides    = t.page_overrides   if t else None,
    )


def _tema_response(f: Faculdade) -> FaculdadeTemaResponse:
    """Compatível com código legado. Usa tema_ativo se disponível."""
    return _build_tema_response(f, f.tema_ativo)


def _assert_tema_owner(tema: FaculdadeTema, faculdade_id: int) -> None:
    if tema.faculdade_id != faculdade_id:
        raise HTTPException(status_code=403, detail="Acesso negado: tema pertence a outra faculdade")


# ---------------------------------------------------------------------------
# White-label: endpoints do tema ativo (compat. 1:1 anterior)
# ---------------------------------------------------------------------------

@router.get(
    "/minha/tema",
    response_model=FaculdadeTemaResponse,
    summary="Obter tema ativo da faculdade do usuário autenticado",
    description=(
        "Retorna o tema ativo da instituição à qual o usuário pertence. "
        "Acessível por qualquer role autenticado (aluno, instrutor, admin, instituicao). "
        "O tenant é resolvido exclusivamente via faculdade_id do JWT — nunca por parâmetro de URL."
    ),
)
def obter_meu_tema(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.models import AdminRoleEnum as ModelAdminRoleEnum

    # Super admin sem faculdade_id vinculado não tem tema próprio
    is_super_admin_sem_tenant = (
        current_user.admin_role == ModelAdminRoleEnum.super_admin
        and not current_user.faculdade_id
    )
    if is_super_admin_sem_tenant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Super admins sem faculdade vinculada não possuem tema próprio",
        )

    if not current_user.faculdade_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não está vinculado a nenhuma faculdade",
        )

    f = db.query(Faculdade).filter(Faculdade.id == current_user.faculdade_id).first()
    if not f:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculdade não encontrada",
        )

    return _tema_response(f)


@router.put(
    "/minha/tema",
    response_model=FaculdadeTemaResponse,
    summary="Atualizar tema ativo (admin)",
)
def atualizar_meu_tema(
    payload: FaculdadeTemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.models import AdminRoleEnum as ModelAdminRoleEnum, RoleEnum as ModelRoleEnum
    is_admin = (
        current_user.admin_role == ModelAdminRoleEnum.super_admin
        or current_user.role in (ModelRoleEnum.admin, ModelRoleEnum.instituicao)
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar o tema")

    from app.services.color_palette import generate_palette, validate_contrast

    f = _ensure_faculdade(db, current_user)

    data = payload.model_dump(exclude_unset=True)

    # ── Enriquecimento automático de paleta ──────────────────────────────────
    # Se o admin enviou primary_color, geramos automaticamente:
    #   - secondary_color (se não enviado pelo admin)
    #   - dark_primary_color / dark_secondary_color / dark_background_color (se não enviados)
    #   - background_color (se não enviado e era o padrão)
    # O admin ainda pode sobrescrever qualquer campo — enriquecemos apenas o que falta.
    if "primary_color" in data:
        palette = generate_palette(data["primary_color"])
        tokens  = palette.tokens
        a11y    = palette.accessibility

        # Bloqueia cores que não passam nem no AA Large (3:1 mínimo para UI components)
        if not a11y.aa_large_pass:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Contraste insuficiente: {max(a11y.white_on_primary, a11y.black_on_primary):.1f}:1. "
                    "A cor primária precisa ter pelo menos 3.0:1 de contraste com branco ou preto."
                ),
            )

        # Preenche apenas os campos que o admin NÃO enviou explicitamente.
        # Isso garante que overrides manuais do admin sempre prevalecem.
        auto_fields = {
            "secondary_color":      tokens.secondary_hex,
            "dark_primary_color":   tokens.dark_interactive_default,
            "dark_secondary_color": tokens.dark_interactive_active,
            "dark_background_color": tokens.dark_background,
        }
        # background_color: só auto-preenche se o admin não enviou
        if "background_color" not in data:
            auto_fields["background_color"] = tokens.background_light

        for key, auto_val in auto_fields.items():
            if key not in data:
                data[key] = auto_val

    # Usa o tema ativo ou cria um novo
    tema = f.tema_ativo
    if not tema:
        tema = FaculdadeTema(faculdade_id=f.id, nome="Tema Padrão")
        db.add(tema)
        db.flush()
        f.tema_ativo_id = tema.id

    for key, value in data.items():
        setattr(tema, key, value)

    db.commit()
    db.refresh(f)
    return _tema_response(f)


# ---------------------------------------------------------------------------
# White-label: múltiplos temas por faculdade
# ---------------------------------------------------------------------------

@router.get(
    "/minha/temas",
    response_model=List[FaculdadeTemaListItem],
    summary="Listar todos os temas da minha faculdade",
)
def listar_meus_temas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not current_user.faculdade_id:
        raise HTTPException(status_code=404, detail="Sem faculdade vinculada")
    f = _get_or_404(db, current_user.faculdade_id)
    temas = db.query(FaculdadeTema).filter(FaculdadeTema.faculdade_id == f.id).order_by(FaculdadeTema.criado_em).all()
    return [
        FaculdadeTemaListItem(
            id=t.id, nome=t.nome,
            primary_color=t.primary_color, secondary_color=t.secondary_color,
            background_color=t.background_color, dark_mode=t.dark_mode,
            favicon_url=t.favicon_url, criado_em=t.criado_em,
            ativo=(t.id == f.tema_ativo_id),
        )
        for t in temas
    ]


@router.post(
    "/minha/temas",
    response_model=FaculdadeTemaListItem,
    status_code=201,
    summary="Criar novo tema",
)
def criar_tema(
    payload: FaculdadeTemaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    from app.models import RoleEnum as ModelRoleEnum
    if current_user.role not in (ModelRoleEnum.admin, ModelRoleEnum.instituicao) \
            and not current_user.admin_role:
        raise HTTPException(status_code=403, detail="Sem permissão")
    if not current_user.faculdade_id:
        raise HTTPException(status_code=403, detail="Sem faculdade vinculada")

    from app.services.color_palette import generate_palette

    f = _get_or_404(db, current_user.faculdade_id)

    data = payload.model_dump()
    if data.get("primary_color"):
        palette = generate_palette(data["primary_color"])
        tokens  = palette.tokens
        a11y    = palette.accessibility
        if not a11y.aa_large_pass:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Contraste insuficiente: {max(a11y.white_on_primary, a11y.black_on_primary):.1f}:1. "
                    "Mínimo 3.0:1 exigido."
                ),
            )
        # Enriquece apenas campos cujo valor ainda é o default (não personalizado)
        defaults = {"secondary_color": "#0f4b2a", "dark_primary_color": "#34d399",
                    "dark_secondary_color": "#10b981", "dark_background_color": "#0f172a",
                    "background_color": "#f0fdf4"}
        auto_map = {
            "secondary_color":       tokens.secondary_hex,
            "dark_primary_color":    tokens.dark_interactive_default,
            "dark_secondary_color":  tokens.dark_interactive_active,
            "dark_background_color": tokens.dark_background,
            "background_color":      tokens.background_light,
        }
        for key, auto_val in auto_map.items():
            if data.get(key) == defaults.get(key) or not data.get(key):
                data[key] = auto_val

    tema = FaculdadeTema(faculdade_id=f.id, **data)
    db.add(tema)
    db.flush()
    # Primeiro tema criado vira ativo automaticamente
    if f.tema_ativo_id is None:
        f.tema_ativo_id = tema.id
    db.commit()
    db.refresh(tema)
    return FaculdadeTemaListItem(
        id=tema.id, nome=tema.nome,
        primary_color=tema.primary_color, secondary_color=tema.secondary_color,
        background_color=tema.background_color, dark_mode=tema.dark_mode,
        favicon_url=tema.favicon_url, criado_em=tema.criado_em,
        ativo=(tema.id == f.tema_ativo_id),
    )


@router.put(
    "/minha/temas/{tema_id}",
    response_model=FaculdadeTemaListItem,
    summary="Atualizar tema específico",
)
def atualizar_tema(
    tema_id: int,
    payload: FaculdadeTemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not current_user.faculdade_id:
        raise HTTPException(status_code=403, detail="Sem faculdade vinculada")
    f = _get_or_404(db, current_user.faculdade_id)
    tema = db.query(FaculdadeTema).filter(FaculdadeTema.id == tema_id).first()
    if not tema:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    from app.services.color_palette import generate_palette

    _assert_tema_owner(tema, f.id)

    data = payload.model_dump(exclude_unset=True)
    if "primary_color" in data:
        palette = generate_palette(data["primary_color"])
        tokens  = palette.tokens
        a11y    = palette.accessibility
        if not a11y.aa_large_pass:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Contraste insuficiente: {max(a11y.white_on_primary, a11y.black_on_primary):.1f}:1. "
                    "Mínimo 3.0:1 exigido."
                ),
            )
        auto_fields = {
            "secondary_color":       tokens.secondary_hex,
            "dark_primary_color":    tokens.dark_interactive_default,
            "dark_secondary_color":  tokens.dark_interactive_active,
            "dark_background_color": tokens.dark_background,
        }
        if "background_color" not in data:
            auto_fields["background_color"] = tokens.background_light
        for key, auto_val in auto_fields.items():
            if key not in data:
                data[key] = auto_val

    for key, value in data.items():
        setattr(tema, key, value)
    db.commit()
    db.refresh(tema)
    db.refresh(f)
    return FaculdadeTemaListItem(
        id=tema.id, nome=tema.nome,
        primary_color=tema.primary_color, secondary_color=tema.secondary_color,
        background_color=tema.background_color, dark_mode=tema.dark_mode,
        favicon_url=tema.favicon_url, criado_em=tema.criado_em,
        ativo=(tema.id == f.tema_ativo_id),
    )


@router.post(
    "/minha/temas/{tema_id}/ativar",
    response_model=FaculdadeTemaResponse,
    summary="Ativar tema (trocar tema em uso)",
)
def ativar_tema(
    tema_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not current_user.faculdade_id:
        raise HTTPException(status_code=403, detail="Sem faculdade vinculada")
    f = _get_or_404(db, current_user.faculdade_id)
    tema = db.query(FaculdadeTema).filter(FaculdadeTema.id == tema_id).first()
    if not tema:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    _assert_tema_owner(tema, f.id)
    f.tema_ativo_id = tema.id
    db.commit()
    db.refresh(f)
    return _tema_response(f)


@router.delete(
    "/minha/temas/{tema_id}",
    status_code=204,
    summary="Excluir tema (não pode ser o ativo)",
)
def excluir_tema(
    tema_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not current_user.faculdade_id:
        raise HTTPException(status_code=403, detail="Sem faculdade vinculada")
    f = _get_or_404(db, current_user.faculdade_id)
    tema = db.query(FaculdadeTema).filter(FaculdadeTema.id == tema_id).first()
    if not tema:
        raise HTTPException(status_code=404, detail="Tema não encontrado")
    _assert_tema_owner(tema, f.id)
    if f.tema_ativo_id == tema_id:
        raise HTTPException(status_code=400, detail="Não é possível excluir o tema ativo. Ative outro tema primeiro.")
    db.delete(tema)
    db.commit()


# ---------------------------------------------------------------------------
# White-label: tema público por slug (sem autenticação)
# ---------------------------------------------------------------------------

@router.get(
    "/publica/tema/{slug}",
    response_model=FaculdadeTemaResponse,
    summary="Tema público por slug (sem autenticação)",
)
def obter_tema_por_slug(slug: str, db: Session = Depends(get_db)):
    f = db.query(Faculdade).filter(Faculdade.slug == slug, Faculdade.ativa == True).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculdade não encontrada")
    return _tema_response(f)
