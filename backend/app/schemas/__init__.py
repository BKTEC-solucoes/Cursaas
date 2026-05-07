from pydantic import BaseModel, EmailStr, Field, computed_field, model_validator, field_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum
import re

# ==================== ENUMS ====================

class RoleEnum(str, PyEnum):
    admin       = "admin"
    aluno       = "aluno"
    instituicao = "instituicao"

class PlanoFaculdadeEnum(str, PyEnum):
    basico       = "basico"
    profissional = "profissional"
    enterprise   = "enterprise"

class VinculoStatusEnum(str, PyEnum):
    ativo     = "ativo"
    suspenso  = "suspenso"
    desligado = "desligado"

class SolicitacaoStatusEnum(str, PyEnum):
    pendente = "pendente"
    aprovada = "aprovada"
    recusada = "recusada"

class SpacingEnum(str, PyEnum):
    compact     = "compact"
    comfortable = "comfortable"
    spacious    = "spacious"

class ButtonStyleEnum(str, PyEnum):
    rounded = "rounded"
    square  = "square"
    pill    = "pill"

class ShadowLevelEnum(str, PyEnum):
    none   = "none"
    soft   = "soft"
    strong = "strong"

class LayoutTypeEnum(str, PyEnum):
    topbar  = "topbar"
    sidebar = "sidebar"

class ContentWidthEnum(str, PyEnum):
    full  = "full"
    boxed = "boxed"

class AnimIntensityEnum(str, PyEnum):
    none       = "none"
    reduced    = "reduced"
    normal     = "normal"
    expressive = "expressive"

class TransitionTypeEnum(str, PyEnum):
    instant = "instant"
    fade    = "fade"
    slide   = "slide"
    spring  = "spring"

# ── Helpers de validação de tema ──────────────────────────────────────────────
# Regex
_HEX_RE      = re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$')
_CSS_LEN_RE  = re.compile(r'^\d{1,3}(\.\d{1,2})?(px|rem|em|%)$')
_FONT_INJECT = re.compile(r'[;{}@<>\\]')

# Limites
_MAX_BORDER_RADIUS_PX = 32  # acima disso os layouts quebram
_MIN_COLOR_CONTRAST   = 1.2  # primary × background: previne tokens invisíveis

# page_overrides: páginas e campos autorizados
_ALLOWED_PAGE_OVERRIDE_PAGES  = frozenset({
    'dashboard', 'alunos', 'cursos', 'aulas', 'notas', 'perfil',
})
_ALLOWED_PAGE_OVERRIDE_FIELDS = frozenset({
    'primary_color', 'secondary_color', 'background_color',
    'border_radius', 'button_style', 'shadow_level', 'gradient_enabled',
})


def _luminance(hex_color: str) -> float:
    """Luminância relativa WCAG 2.1 (0 = preto absoluto, 1 = branco)."""
    h = hex_color.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255
    def _lin(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def _contrast_ratio(c1: str, c2: str) -> float:
    """Razão de contraste WCAG 2.1 entre duas cores hex."""
    l1, l2 = _luminance(c1), _luminance(c2)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


# ==================== SCHEMAS DE SOLICITAÇÃO DE CADASTRO ====================

class SolicitacaoCadastroCreate(BaseModel):
    """Payload do auto-cadastro público. Não requer autenticação."""
    nome:         str      = Field(..., min_length=2, max_length=255)
    email:        EmailStr
    faculdade_id: int      = Field(..., gt=0, description="ID da faculdade onde deseja ingressar")
    telefone:     Optional[str] = Field(None, max_length=20)
    cpf_rg:       Optional[str] = Field(None, max_length=30)
    mensagem:     Optional[str] = Field(None, max_length=1000)

class SolicitacaoCadastroResponse(BaseModel):
    id:            int
    nome:          str
    email:         str
    faculdade_id:  int
    status:        SolicitacaoStatusEnum
    criado_em:     datetime

    model_config = {"from_attributes": True}


class SolicitacaoCadastroAdminResponse(BaseModel):
    """Schema completo para listagem/detalhe pelo super admin."""
    id:              int
    nome:            str
    email:           str
    telefone:        Optional[str]
    cpf_rg:          Optional[str]
    mensagem:        Optional[str]
    faculdade_id:    int
    faculdade_nome:  Optional[str] = None
    status:          SolicitacaoStatusEnum
    motivo_recusa:   Optional[str]
    usuario_id:      Optional[int]
    criado_em:       datetime
    revisado_em:     Optional[datetime]
    revisado_por_id: Optional[int]

    model_config = {"from_attributes": True}

# ==================== SCHEMAS DE FACULDADE ====================

class FaculdadeCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r'^[a-z0-9-]+$',
                      description="Identificador único URL-friendly, apenas letras minúsculas, números e hífens")
    cnpj: Optional[str] = Field(None, max_length=18)
    email_contato: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[str] = Field(None, max_length=500)
    dominio_email: Optional[str] = Field(None, max_length=100,
                                          description="Ex: @faculdade.edu.br")
    plano: PlanoFaculdadeEnum = PlanoFaculdadeEnum.basico

class FaculdadeUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    email_contato: Optional[EmailStr] = None
    telefone: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[str] = Field(None, max_length=500)
    dominio_email: Optional[str] = Field(None, max_length=100)
    ativa: Optional[bool] = None
    aprovada: Optional[bool] = None
    plano: Optional[PlanoFaculdadeEnum] = None

class FaculdadeTemaResponse(BaseModel):
    """Resposta pública do tema ativo de uma faculdade."""
    faculdade_id: int
    nome: str
    logo_url: Optional[str] = None
    # Modo claro
    primary_color:    str = '#1a6b3c'
    secondary_color:  str = '#0f4b2a'
    background_color: str = '#f0fdf4'
    font_family:      str = 'Inter, system-ui, sans-serif'
    # Dark mode
    dark_mode:             bool = False
    dark_primary_color:    str = '#34d399'
    dark_secondary_color:  str = '#10b981'
    dark_background_color: str = '#0f172a'
    # Favicon
    favicon_url: Optional[str] = None
    # Identidade visual avançada
    border_radius:    str             = '8px'
    spacing:          SpacingEnum     = SpacingEnum.comfortable
    button_style:     ButtonStyleEnum = ButtonStyleEnum.rounded
    shadow_level:     ShadowLevelEnum = ShadowLevelEnum.soft
    layout_type:      LayoutTypeEnum  = LayoutTypeEnum.topbar
    content_width:    ContentWidthEnum = ContentWidthEnum.boxed
    sidebar_collapsible: bool         = True
    anim_intensity:   AnimIntensityEnum  = AnimIntensityEnum.normal
    transition_type:  TransitionTypeEnum = TransitionTypeEnum.fade
    gradient_enabled: bool            = False
    page_overrides:   Optional[dict]  = None
    # Tela de login
    login_layout:           str           = 'centered'
    login_background_type:  str           = 'gradient'
    login_background_value: Optional[str] = None
    login_message_title:    Optional[str] = None
    login_message_body:     Optional[str] = None

    class Config:
        from_attributes = True

class FaculdadeTemaListItem(BaseModel):
    """Item resumido para listagem dos temas da instituição."""
    id: int
    nome: str
    primary_color: str
    secondary_color: str
    background_color: str
    dark_mode: bool
    favicon_url: Optional[str] = None
    border_radius:    str             = '8px'
    spacing:          SpacingEnum     = SpacingEnum.comfortable
    button_style:     ButtonStyleEnum = ButtonStyleEnum.rounded
    shadow_level:     ShadowLevelEnum = ShadowLevelEnum.soft
    layout_type:      LayoutTypeEnum  = LayoutTypeEnum.topbar
    content_width:    ContentWidthEnum = ContentWidthEnum.boxed
    sidebar_collapsible: bool         = True
    anim_intensity:   AnimIntensityEnum  = AnimIntensityEnum.normal
    transition_type:  TransitionTypeEnum = TransitionTypeEnum.fade
    gradient_enabled: bool            = False
    ativo: bool = False        # calculado na rota
    criado_em: datetime

    class Config:
        from_attributes = True

class FaculdadeTemaCreate(BaseModel):
    """Payload para criar um novo tema."""
    nome:             str  = Field('Novo Tema', max_length=100)
    primary_color:    str  = Field('#1a6b3c', max_length=20)
    secondary_color:  str  = Field('#0f4b2a', max_length=20)
    background_color: str  = Field('#f0fdf4', max_length=20)
    font_family:      str  = Field('Inter, system-ui, sans-serif', max_length=150)
    logo_url_override: Optional[str] = None
    dark_mode:             bool = False
    dark_primary_color:    str  = Field('#34d399', max_length=20)
    dark_secondary_color:  str  = Field('#10b981', max_length=20)
    dark_background_color: str  = Field('#0f172a', max_length=20)
    favicon_url: Optional[str] = None
    # Identidade visual avançada
    border_radius:    str             = Field('8px', max_length=10)
    spacing:          SpacingEnum     = SpacingEnum.comfortable
    button_style:     ButtonStyleEnum = ButtonStyleEnum.rounded
    shadow_level:     ShadowLevelEnum = ShadowLevelEnum.soft
    layout_type:      LayoutTypeEnum  = LayoutTypeEnum.topbar
    content_width:    ContentWidthEnum = ContentWidthEnum.boxed
    sidebar_collapsible: bool         = True
    anim_intensity:   AnimIntensityEnum  = AnimIntensityEnum.normal
    transition_type:  TransitionTypeEnum = TransitionTypeEnum.fade
    gradient_enabled: bool            = False
    page_overrides:   Optional[dict]  = None
    # Tela de login
    login_layout:           str           = Field('centered', max_length=20)
    login_background_type:  str           = Field('gradient', max_length=20)
    login_background_value: Optional[str] = Field(None, max_length=500)
    login_message_title:    Optional[str] = Field(None, max_length=120)
    login_message_body:     Optional[str] = Field(None, max_length=300)

    # ── Validadores de restrição ──────────────────────────────────────────
    @field_validator(
        'primary_color', 'secondary_color', 'background_color',
        'dark_primary_color', 'dark_secondary_color', 'dark_background_color',
        mode='before',
    )
    @classmethod
    def _validate_hex_color(cls, v):
        if v is None:
            return v
        sv = str(v).strip()
        if not _HEX_RE.match(sv):
            raise ValueError(f'Cor "{sv}" inválida — use formato hex #RGB ou #RRGGBB.')
        return sv.lower()

    @field_validator('border_radius', mode='before')
    @classmethod
    def _validate_border_radius(cls, v):
        if v is None:
            return v
        sv = str(v).strip()
        if not _CSS_LEN_RE.match(sv):
            raise ValueError('border_radius deve ser CSS válido (ex: 8px, 0.5rem, 50%).')
        m = re.match(r'^(\d+(?:\.\d+)?)px$', sv)
        if m and float(m.group(1)) > _MAX_BORDER_RADIUS_PX:
            raise ValueError(
                f'border_radius não pode exceder {_MAX_BORDER_RADIUS_PX}px. '
                'Para bordas pill completas use button_style="pill".'
            )
        return sv

    @field_validator('font_family', mode='before')
    @classmethod
    def _validate_font_family(cls, v):
        if v is None:
            return v
        if _FONT_INJECT.search(str(v)):
            raise ValueError(
                'font_family contém caracteres não permitidos. '
                'Use nomes separados por vírgula (ex: "Inter, system-ui, sans-serif").'
            )
        return v

    @field_validator('page_overrides', mode='before')
    @classmethod
    def _validate_page_overrides(cls, v):
        if v is None:
            return v
        if not isinstance(v, dict):
            raise ValueError('page_overrides deve ser um objeto JSON.')
        invalid_pages = set(v.keys()) - _ALLOWED_PAGE_OVERRIDE_PAGES
        if invalid_pages:
            raise ValueError(
                f'page_overrides: páginas desconhecidas {sorted(invalid_pages)}. '
                f'Permitidas: {sorted(_ALLOWED_PAGE_OVERRIDE_PAGES)}.'
            )
        for page, overrides in v.items():
            if not isinstance(overrides, dict):
                raise ValueError(f'page_overrides["{page}"] deve ser um objeto.')
            invalid_fields = set(overrides.keys()) - _ALLOWED_PAGE_OVERRIDE_FIELDS
            if invalid_fields:
                raise ValueError(
                    f'page_overrides["{page}"]: campos não permitidos: {sorted(invalid_fields)}. '
                    'Aceitos: primary_color, secondary_color, background_color, '
                    'border_radius, button_style, shadow_level, gradient_enabled.'
                )
        return v

    @field_validator('logo_url_override', 'favicon_url', mode='before')
    @classmethod
    def validate_image_url(cls, v):
        if v and isinstance(v, str):
            if v.startswith('data:'):
                if not re.match(r'^data:image/(png|jpeg|jpg|gif|webp);base64,', v):
                    raise ValueError('Formato data: URI inválido. Use PNG, JPEG, GIF ou WebP.')
            elif v.startswith('http://'):
                raise ValueError('URLs de imagem devem usar HTTPS (http:// não é aceito).')
        return v

    @field_validator('login_background_value', mode='before')
    @classmethod
    def _validate_login_bg(cls, v):
        if v and isinstance(v, str) and v.startswith('http://'):
            raise ValueError('login_background_value deve usar HTTPS quando for URL de imagem.')
        return v

    @model_validator(mode='after')
    def _check_brand_contrast(self) -> 'FaculdadeTemaCreate':
        try:
            ratio = _contrast_ratio(self.primary_color, self.background_color)
            if ratio < _MIN_COLOR_CONTRAST:
                raise ValueError(
                    f'primary_color e background_color têm contraste insuficiente '
                    f'({ratio:.2f}:1, mínimo {_MIN_COLOR_CONTRAST}:1). O sistema não '
                    'conseguirá derivar tokens de texto legíveis automaticamente.'
                )
        except ValueError as exc:
            if 'contraste' in str(exc):
                raise
        return self

    @model_validator(mode='after')
    def _check_anim_consistency(self) -> 'FaculdadeTemaCreate':
        if self.anim_intensity == AnimIntensityEnum.none:
            self.transition_type = TransitionTypeEnum.instant
        return self

class FaculdadeTemaUpdate(BaseModel):
    """Payload para atualizar um tema existente (todos os campos opcionais)."""
    nome:             Optional[str] = Field(None, max_length=100)
    primary_color:    Optional[str] = Field(None, max_length=20)
    secondary_color:  Optional[str] = Field(None, max_length=20)
    background_color: Optional[str] = Field(None, max_length=20)
    font_family:      Optional[str] = Field(None, max_length=150)
    logo_url_override: Optional[str] = None
    dark_mode:             Optional[bool]  = None
    dark_primary_color:    Optional[str]   = Field(None, max_length=20)
    dark_secondary_color:  Optional[str]   = Field(None, max_length=20)
    dark_background_color: Optional[str]   = Field(None, max_length=20)
    favicon_url: Optional[str] = None
    # Identidade visual avançada
    border_radius:    Optional[str]             = Field(None, max_length=10)
    spacing:          Optional[SpacingEnum]     = None
    button_style:     Optional[ButtonStyleEnum] = None
    shadow_level:     Optional[ShadowLevelEnum] = None
    layout_type:      Optional[LayoutTypeEnum]  = None
    content_width:    Optional[ContentWidthEnum] = None
    sidebar_collapsible: Optional[bool]          = None
    anim_intensity:   Optional[AnimIntensityEnum]  = None
    transition_type:  Optional[TransitionTypeEnum] = None
    gradient_enabled: Optional[bool]            = None
    page_overrides:   Optional[dict]            = None
    # Tela de login
    login_layout:           Optional[str] = Field(None, max_length=20)
    login_background_type:  Optional[str] = Field(None, max_length=20)
    login_background_value: Optional[str] = Field(None, max_length=500)
    login_message_title:    Optional[str] = Field(None, max_length=120)
    login_message_body:     Optional[str] = Field(None, max_length=300)

    # ── Validadores de restrição ──────────────────────────────────────────
    @field_validator(
        'primary_color', 'secondary_color', 'background_color',
        'dark_primary_color', 'dark_secondary_color', 'dark_background_color',
        mode='before',
    )
    @classmethod
    def _validate_hex_color(cls, v):
        if v is None:
            return v
        sv = str(v).strip()
        if not _HEX_RE.match(sv):
            raise ValueError(f'Cor "{sv}" inválida — use formato hex #RGB ou #RRGGBB.')
        return sv.lower()

    @field_validator('border_radius', mode='before')
    @classmethod
    def _validate_border_radius(cls, v):
        if v is None:
            return v
        sv = str(v).strip()
        if not _CSS_LEN_RE.match(sv):
            raise ValueError('border_radius deve ser CSS válido (ex: 8px, 0.5rem, 50%).')
        m = re.match(r'^(\d+(?:\.\d+)?)px$', sv)
        if m and float(m.group(1)) > _MAX_BORDER_RADIUS_PX:
            raise ValueError(
                f'border_radius não pode exceder {_MAX_BORDER_RADIUS_PX}px. '
                'Para bordas pill completas use button_style="pill".'
            )
        return sv

    @field_validator('font_family', mode='before')
    @classmethod
    def _validate_font_family(cls, v):
        if v is None:
            return v
        if _FONT_INJECT.search(str(v)):
            raise ValueError(
                'font_family contém caracteres não permitidos. '
                'Use nomes separados por vírgula (ex: "Inter, system-ui, sans-serif").'
            )
        return v

    @field_validator('page_overrides', mode='before')
    @classmethod
    def _validate_page_overrides(cls, v):
        if v is None:
            return v
        if not isinstance(v, dict):
            raise ValueError('page_overrides deve ser um objeto JSON.')
        invalid_pages = set(v.keys()) - _ALLOWED_PAGE_OVERRIDE_PAGES
        if invalid_pages:
            raise ValueError(
                f'page_overrides: páginas desconhecidas {sorted(invalid_pages)}. '
                f'Permitidas: {sorted(_ALLOWED_PAGE_OVERRIDE_PAGES)}.'
            )
        for page, overrides in v.items():
            if not isinstance(overrides, dict):
                raise ValueError(f'page_overrides["{page}"] deve ser um objeto.')
            invalid_fields = set(overrides.keys()) - _ALLOWED_PAGE_OVERRIDE_FIELDS
            if invalid_fields:
                raise ValueError(
                    f'page_overrides["{page}"]: campos não permitidos: {sorted(invalid_fields)}. '
                    'Aceitos: primary_color, secondary_color, background_color, '
                    'border_radius, button_style, shadow_level, gradient_enabled.'
                )
        return v

    @field_validator('logo_url_override', 'favicon_url', mode='before')
    @classmethod
    def validate_image_url(cls, v):
        if v and isinstance(v, str):
            if v.startswith('data:'):
                if not re.match(r'^data:image/(png|jpeg|jpg|gif|webp);base64,', v):
                    raise ValueError('Formato data: URI inválido. Use PNG, JPEG, GIF ou WebP.')
            elif v.startswith('http://'):
                raise ValueError('URLs de imagem devem usar HTTPS (http:// não é aceito).')
        return v

    @field_validator('login_background_value', mode='before')
    @classmethod
    def _validate_login_bg(cls, v):
        if v and isinstance(v, str) and v.startswith('http://'):
            raise ValueError('login_background_value deve usar HTTPS quando for URL de imagem.')
        return v

    @model_validator(mode='after')
    def _check_brand_contrast(self) -> 'FaculdadeTemaUpdate':
        # Somente valida se ambas as cores foram enviadas nesta atualização
        if self.primary_color and self.background_color:
            try:
                ratio = _contrast_ratio(self.primary_color, self.background_color)
                if ratio < _MIN_COLOR_CONTRAST:
                    raise ValueError(
                        f'primary_color e background_color têm contraste insuficiente '
                        f'({ratio:.2f}:1, mínimo {_MIN_COLOR_CONTRAST}:1).'
                    )
            except ValueError as exc:
                if 'contraste' in str(exc):
                    raise
        return self

    @model_validator(mode='after')
    def _check_anim_consistency(self) -> 'FaculdadeTemaUpdate':
        if self.anim_intensity == AnimIntensityEnum.none:
            self.transition_type = TransitionTypeEnum.instant
        return self

class TemaPresetResponse(BaseModel):
    """Preset de tema para seleção rápida no painel."""
    id: int
    nome: str
    preview_color: str
    primary_color: str
    secondary_color: str
    background_color: str
    font_family: str
    dark_primary_color: str
    dark_secondary_color: str
    dark_background_color: str

    class Config:
        from_attributes = True

class InstituicaoPerfilUpdate(BaseModel):
    """Payload tipado para PATCH /instituicoes/minha — apenas campos públicos editáveis."""
    nome:           Optional[str]      = Field(None, min_length=2, max_length=255)
    email_contato:  Optional[EmailStr] = None
    telefone:       Optional[str]      = Field(None, max_length=20)
    dominio_email:  Optional[str]      = Field(None, max_length=100)

class FaculdadeResponse(BaseModel):
    id: int
    nome: str
    slug: str
    cnpj: Optional[str] = None
    email_contato: Optional[str] = None
    telefone: Optional[str] = None
    logo_url: Optional[str] = None
    dominio_email: Optional[str] = None
    ativa: bool
    aprovada: bool
    plano: str
    data_criacao: datetime
    data_atualizacao: datetime

    class Config:
        from_attributes = True

class FaculdadePageResponse(BaseModel):
    items: List[FaculdadeResponse]
    total: int
    page: int
    limit: int
    total_pages: int

# ==================== SCHEMAS DE VÍNCULO ====================

class VinculoCreate(BaseModel):
    usuario_id: int
    matricula: Optional[str] = Field(None, max_length=50)

class VinculoUpdate(BaseModel):
    matricula: Optional[str] = Field(None, max_length=50)
    status: Optional[VinculoStatusEnum] = None

class VinculoResponse(BaseModel):
    id: int
    usuario_id: int
    faculdade_id: int
    matricula: Optional[str] = None
    status: str
    data_vinculo: datetime

    class Config:
        from_attributes = True

class AdminRoleEnum(str, PyEnum):
    super_admin = "super_admin"
    instrutor   = "instrutor"

class CourseRequestStatusEnum(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class StatusCursoEnum(str, PyEnum):
    pendente = "pendente"
    aprovado = "aprovado"
    recusado = "recusado"

class StatusInstituicaoEnum(str, PyEnum):
    pendente = "pendente"
    aprovado = "aprovado"
    recusado = "recusado"

# ==================== SCHEMAS DE INSTITUIÇÃO ====================

class InstituicaoCreate(BaseModel):
    nome_instituicao: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ com ou sem formatação")
    endereco: str = Field(..., min_length=5, max_length=500)
    contato: str = Field(..., min_length=10, max_length=20)
    nome_responsavel: Optional[str] = None
    senha: str = Field(..., min_length=6, max_length=255)

class InstituicaoResponse(BaseModel):
    id: int
    nome_instituicao: str
    cnpj: str
    contato: str
    endereco: str
    ativa: bool
    aprovada: bool
    data_criacao: datetime
    data_atualizacao: datetime

    class Config:
        from_attributes = True

class InstituicaoStatusUpdate(BaseModel):
    status: StatusInstituicaoEnum

class AcessoInstituicaoUpdate(BaseModel):
    ativa: bool

class InstituicaoPageResponse(BaseModel):
    items: list[InstituicaoResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class InstituicaoDetailResponse(InstituicaoResponse):
    data_atualizacao: datetime

# ==================== SCHEMAS DE USUÁRIO ====================

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    # Dados pessoais
    data_nascimento: Optional[date] = None
    sexo: Optional[str] = None
    cpf_rg: Optional[str] = None
    # Endereço e contato
    endereco: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    # Responsável
    nome_responsavel: Optional[str] = None
    # Dados escolares
    numero_matricula: Optional[str] = None
    turma: Optional[str] = None
    historico_escolar: Optional[str] = None

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)
    data_nascimento: date
    sexo: str
    cpf_rg: str
    endereco: str
    cep: str
    telefone: str
    nome_responsavel: str
    numero_matricula: str
    turma: str
    historico_escolar: str


class UsuarioCreateSimples(BaseModel):
    """Schema para registro simplificado de alunos"""
    nome: str = Field(..., min_length=1)
    email: EmailStr
    senha: str = Field(..., min_length=6)
    faculdade_id: int = Field(..., gt=0, description="ID da faculdade à qual o aluno deseja se vincular")


class AdminCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(..., min_length=6)
    admin_role: AdminRoleEnum = AdminRoleEnum.super_admin
    foto_perfil: Optional[str] = None  # URL da foto ou avatar
    curso_ids: List[int] = []
    # Dados pessoais opcionais
    telefone: Optional[str] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    cpf_rg: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None

class AdminUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    admin_role: Optional[AdminRoleEnum] = None
    foto_perfil: Optional[str] = None
    curso_ids: Optional[List[int]] = None
    # Dados pessoais opcionais
    telefone: Optional[str] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    cpf_rg: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None


class AdminManageResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr
    admin_role: Optional[AdminRoleEnum] = None
    foto_perfil: Optional[str] = None
    ativo: bool = True
    curso_ids: List[int] = []
    # Dados pessoais
    telefone: Optional[str] = None
    sexo: Optional[str] = None
    data_nascimento: Optional[date] = None
    cpf_rg: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None

    class Config:
        from_attributes = True


class AdminListResponse(BaseModel):
    items: List[AdminManageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== SCHEMAS DE CONVITE ====================

class ConviteAdminCreate(BaseModel):
    email: EmailStr
    admin_role: AdminRoleEnum = AdminRoleEnum.instrutor


class ConviteAdminResponse(BaseModel):
    id: int
    email: EmailStr
    admin_role: AdminRoleEnum
    usado: bool
    data_criacao: datetime
    data_expiracao: datetime
    data_uso: Optional[datetime] = None
    convidado_por_nome: Optional[str] = None

    class Config:
        from_attributes = True


class AceitarConviteRequest(BaseModel):
    token: str
    nome: str = Field(..., min_length=2)
    senha: str = Field(..., min_length=6)

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: Optional[bool] = None
    data_nascimento: Optional[date] = None
    sexo: Optional[str] = None
    cpf_rg: Optional[str] = None
    endereco: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    nome_responsavel: Optional[str] = None
    numero_matricula: Optional[str] = None
    turma: Optional[str] = None
    historico_escolar: Optional[str] = None

class UsuarioResponse(UsuarioBase):
    id: int
    role: RoleEnum
    admin_role: Optional[AdminRoleEnum] = None
    foto_perfil: Optional[str] = None
    instituicao_id: Optional[int] = None
    faculdade_id: Optional[int] = None
    ativo: bool
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class UsuarioDetailResponse(UsuarioResponse):
    data_atualizacao: datetime

# ==================== SCHEMAS DE AUTENTICAÇÃO ====================

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# ==================== SCHEMAS DE CURSO ====================

class CursoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    pago: bool = False
    valor: Optional[Decimal] = None
    percentual_presenca_minima: int = Field(default=75, ge=0, le=100)

class CursoCreate(CursoBase):
    @model_validator(mode="after")
    def validate_paid_course_rules(self):
        if self.pago:
            # Se for pago e não tem valor, usa 0.0 temporariamente como padrão
            if self.valor is None or self.valor <= 0:
                self.valor = Decimal("0.0")
        else:
            self.valor = None
        return self

class CursoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    pago: Optional[bool] = None
    valor: Optional[Decimal] = None
    percentual_presenca_minima: Optional[int] = None
    ativo: Optional[bool] = None

    @model_validator(mode="after")
    def validate_paid_course_rules(self):
        if self.pago is True:
            # Se for pago e não tem valor, usa 0.0 temporariamente como padrão
            if self.valor is None or self.valor <= 0:
                self.valor = Decimal("0.0")
        if self.pago is False:
            self.valor = None
        return self

class CursoResponse(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    pago: bool = False
    valor: Optional[Decimal] = None
    percentual_presenca_minima: int = Field(default=75, ge=0, le=100)
    status: StatusCursoEnum
    ativo: bool
    data_criacao: datetime

    @computed_field
    @property
    def isPago(self) -> bool:
        return self.pago

    @computed_field
    @property
    def preco(self) -> Decimal:
        return self.valor or Decimal("0")
    
    class Config:
        from_attributes = True

class CursoDetailResponse(CursoResponse):
    data_atualizacao: datetime
    aulas: List['AulaResponse'] = []
    provas: List['ProvaResponse'] = []

class CursoAdminResponse(CursoResponse):
    """Schema para admin listar cursos com status completo"""
    data_atualizacao: datetime

# ==================== SCHEMAS DE INSCRIÇÃO EM CURSO ====================

class InscricaoCursoCreate(BaseModel):
    usuario_id: int
    curso_id: int

class InscricaoCursoResponse(BaseModel):
    id: int
    usuario_id: int
    curso_id: int
    data_inscricao: datetime
    
    class Config:
        from_attributes = True

# ==================== SCHEMAS DE SOLICITAÇÃO DE CURSO ====================

class CourseRequestCreate(BaseModel):
    curso_id: int

class CourseRequestUpdate(BaseModel):
    status: CourseRequestStatusEnum

class CourseRequestResponse(BaseModel):
    id: int
    usuario_id: int
    curso_id: int
    status: CourseRequestStatusEnum
    created_at: datetime
    updated_at: datetime
    usuario_nome: Optional[str] = None
    usuario_email: Optional[str] = None
    curso_nome: Optional[str] = None
    curso_pago: Optional[bool] = None

    @computed_field
    @property
    def userId(self) -> int:
        return self.usuario_id

    @computed_field
    @property
    def cursoId(self) -> int:
        return self.curso_id

    @computed_field
    @property
    def data(self) -> datetime:
        return self.created_at

    class Config:
        from_attributes = True

# ==================== SCHEMAS DE AULA ====================

class AulaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    data_aula: datetime
    duracao_minutos: Optional[int] = None

class AulaCreate(AulaBase):
    curso_id: int

class AulaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_aula: Optional[datetime] = None
    duracao_minutos: Optional[int] = None
    ativo: Optional[bool] = None

class AulaResponse(AulaBase):
    id: int
    curso_id: int
    ativo: bool
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class AulaDetailResponse(AulaResponse):
    data_atualizacao: datetime
    videos: List['VideoResponse'] = []

# ==================== SCHEMAS DE VÍDEO ====================

class VideoBase(BaseModel):
    arquivo_nome: str
    duracao_segundos: Optional[int] = None

class VideoResponse(VideoBase):
    id: int
    aula_id: int
    caminho_arquivo: str
    tamanho_bytes: Optional[int] = None
    formato: Optional[str] = None
    status: str
    data_upload: datetime
    
    class Config:
        from_attributes = True

# ==================== SCHEMAS DE PRESENÇA ====================

class PresencaBase(BaseModel):
    percentual_assistido: int = Field(default=0, ge=0, le=100)
    tempo_total_segundos: int = Field(default=0, ge=0)

class PresencaUpdate(BaseModel):
    percentual_assistido: int = Field(ge=0, le=100)
    tempo_total_segundos: int = Field(ge=0)

class PresencaManualUpdate(BaseModel):
    percentual_assistido: int = Field(ge=0, le=100, description="Percentual de presença a definir manualmente (0-100)")

class PresencaResponse(BaseModel):
    id: int
    usuario_id: int
    aula_id: int
    percentual_assistido: int
    registrada_automaticamente: bool
    tempo_total_segundos: int
    data_acesso: datetime
    data_conclusao: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PresencaProgressRequest(BaseModel):
    percentual_assistido: int = Field(..., ge=0, le=100, description="Percentual de vídeo assistido (0-100)")
    tempo_total_segundos: int = Field(..., ge=0, description="Tempo total em segundos que a aula foi assistida")

class PresencaDetailResponse(PresencaResponse):
    usuario_nome: Optional[str] = None
    aula_titulo: Optional[str] = None
    aula_duracao_minutos: Optional[int] = None

class PresencaAlunoResponse(BaseModel):
    id: int
    usuario_id: int
    aula_id: int
    aula_titulo: str
    aula_data: datetime
    percentual_assistido: int
    registrada_automaticamente: bool
    data_conclusao: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PresencaCursoResponse(BaseModel):
    aluno_id: int
    aluno_nome: str
    aluno_email: str
    total_aulas: int
    aulas_assistidas_75: int
    percentual_presenca: float
    presencas: List[PresencaAlunoResponse]
    
    class Config:
        from_attributes = True

# ==================== SCHEMAS DE PROVA ====================

class ProvaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    data_inicio: datetime
    data_fim: datetime
    tempo_limite_minutos: Optional[int] = None
    tentativas_permitidas: int = Field(default=1, ge=1)

class ProvaCreate(ProvaBase):
    curso_id: int
    questoes: Optional[List['QuestaoCreateWithOpcoes']] = None

class ProvaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    tempo_limite_minutos: Optional[int] = None
    tentativas_permitidas: Optional[int] = None
    ativo: Optional[bool] = None
    questoes: Optional[List['QuestaoCreateWithOpcoes']] = None

class ProvaResponse(ProvaBase):
    id: int
    curso_id: int
    curso_nome: Optional[str] = None
    total_questoes: int = 0
    ativo: bool
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class ProvaDetailResponse(ProvaResponse):
    data_atualizacao: datetime
    questoes: List['QuestaoDetailResponse'] = []

# ==================== SCHEMAS DE QUESTÃO ====================

class OpcaoRespostaBase(BaseModel):
    texto: str
    ordem: Optional[int] = None

class OpcaoRespostaCreate(OpcaoRespostaBase):
    correta: bool = False

class OpcaoRespostaDetailCreate(OpcaoRespostaBase):
    """Schema para criar opção com a flag correta"""
    texto: str
    correta: bool = False

class OpcaoRespostaResponse(OpcaoRespostaBase):
    id: int
    
    class Config:
        from_attributes = True

class OpcaoRespostaDetailResponse(OpcaoRespostaResponse):
    correta: bool
    
    class Config:
        from_attributes = True

class QuestaoBase(BaseModel):
    tipo: str = "multipla_escolha"
    enunciado: str
    ordem: Optional[int] = None
    pontos: Decimal = Field(default=1.00, ge=0)

class QuestaoCreateRequest(QuestaoBase):
    pass  # prova_id vem da URL

class QuestaoCreateWithOpcoes(QuestaoBase):
    """Schema para criar questão com opções - usada ao criar prova com questões"""
    opcoes: List[OpcaoRespostaDetailCreate] = []

class QuestaoCreate(QuestaoBase):
    prova_id: int

class QuestaoUpdate(BaseModel):
    enunciado: Optional[str] = None
    tipo: Optional[str] = None
    ordem: Optional[int] = None
    pontos: Optional[Decimal] = None

class QuestaoResponse(QuestaoBase):
    id: int
    prova_id: int
    data_criacao: datetime
    opcoes: List[OpcaoRespostaResponse] = []
    
    class Config:
        from_attributes = True

class QuestaoDetailResponse(QuestaoResponse):
    opcoes: List[OpcaoRespostaDetailResponse] = []

# ==================== SCHEMAS DE RESPOSTA ====================

class RespostaCreate(BaseModel):
    questao_id: int
    prova_id: int
    opcao_id: Optional[int] = None
    texto_resposta: Optional[str] = None

class RespostaSubmitItem(BaseModel):
    questao_id: int
    opcao_id: Optional[int] = None
    texto_resposta: Optional[str] = None

class ProvaSubmitRequest(BaseModel):
    respostas: List[RespostaSubmitItem] = Field(..., min_items=1)

class RespostaResponse(BaseModel):
    id: int
    usuario_id: int
    questao_id: int
    prova_id: int
    opcao_id: Optional[int] = None
    texto_resposta: Optional[str] = None
    correta: Optional[bool] = None
    data_resposta: datetime
    
    class Config:
        from_attributes = True

class ProvaResultResponse(BaseModel):
    prova_id: int
    usuario_id: int
    total_questoes: int
    total_acertos: int
    nota_final: Optional[Decimal] = None
    percentual_acerto: float
    tentativa: int = 1
    respostas: List[RespostaResponse] = []
    data_submissao: datetime

# ==================== SCHEMAS DE NOTA ====================

class NotaBase(BaseModel):
    nota_final: Optional[Decimal] = None
    tentativa: int = Field(default=1, ge=1)
    observacoes: Optional[str] = None

class NotaCreate(NotaBase):
    usuario_id: int
    prova_id: int

class NotaUpdate(BaseModel):
    nota_final: Optional[Decimal] = None
    observacoes: Optional[str] = None

class NotaResponse(NotaBase):
    id: int
    usuario_id: int
    prova_id: int
    data_submissao: Optional[datetime] = None
    data_correcao: Optional[datetime] = None
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class NotaDetailResponse(NotaResponse):
    usuario_nome: Optional[str] = None
    prova_titulo: Optional[str] = None
    prova_curso_id: Optional[int] = None

class NotaListResponse(NotaResponse):
    usuario_nome: Optional[str] = None
    prova_titulo: Optional[str] = None

# ==================== SCHEMAS DE NOTA DE CURSO ====================

class NotaCursoBase(BaseModel):
    media_final: Optional[Decimal] = None
    aprovado: Optional[bool] = None

class NotaCursoCreate(NotaCursoBase):
    usuario_id: int
    curso_id: int

class NotaCursoUpdate(BaseModel):
    media_final: Optional[Decimal] = None
    aprovado: Optional[bool] = None

class NotaCursoResponse(NotaCursoBase):
    id: int
    usuario_id: int
    curso_id: int
    data_atualizacao: datetime
    
    class Config:
        from_attributes = True

class NotaCursoDetailResponse(NotaCursoResponse):
    usuario_nome: Optional[str] = None
    curso_nome: Optional[str] = None
    notas_provas: Optional[List[NotaListResponse]] = []

# Update forward references
AulaResponse.model_rebuild()
AulaDetailResponse.model_rebuild()
CursoDetailResponse.model_rebuild()
ProvaCreate.model_rebuild()
ProvaUpdate.model_rebuild()
ProvaDetailResponse.model_rebuild()
QuestaoDetailResponse.model_rebuild()
