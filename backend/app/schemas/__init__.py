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
    gradient_enabled: bool            = False
    page_overrides:   Optional[dict]  = None

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
    logo_url_override: Optional[str] = Field(None, max_length=500)
    dark_mode:             bool = False
    dark_primary_color:    str  = Field('#34d399', max_length=20)
    dark_secondary_color:  str  = Field('#10b981', max_length=20)
    dark_background_color: str  = Field('#0f172a', max_length=20)
    favicon_url: Optional[str] = Field(None, max_length=500)
    # Identidade visual avançada
    border_radius:    str             = Field('8px', max_length=10)
    spacing:          SpacingEnum     = SpacingEnum.comfortable
    button_style:     ButtonStyleEnum = ButtonStyleEnum.rounded
    shadow_level:     ShadowLevelEnum = ShadowLevelEnum.soft
    layout_type:      LayoutTypeEnum  = LayoutTypeEnum.topbar
    gradient_enabled: bool            = False

    @field_validator('logo_url_override', 'favicon_url', mode='before')
    @classmethod
    def validate_image_url(cls, v):
        if v and isinstance(v, str) and v.startswith('data:'):
            if not re.match(r'^data:image/(png|jpeg|jpg|gif|webp);base64,', v):
                raise ValueError('Formato de imagem data: não permitido. Use PNG, JPEG, GIF ou WebP.')
        return v

class FaculdadeTemaUpdate(BaseModel):
    """Payload para atualizar um tema existente (todos os campos opcionais)."""
    nome:             Optional[str] = Field(None, max_length=100)
    primary_color:    Optional[str] = Field(None, max_length=20)
    secondary_color:  Optional[str] = Field(None, max_length=20)
    background_color: Optional[str] = Field(None, max_length=20)
    font_family:      Optional[str] = Field(None, max_length=150)
    logo_url_override: Optional[str] = Field(None, max_length=500)
    dark_mode:             Optional[bool]  = None
    dark_primary_color:    Optional[str]   = Field(None, max_length=20)
    dark_secondary_color:  Optional[str]   = Field(None, max_length=20)
    dark_background_color: Optional[str]   = Field(None, max_length=20)
    favicon_url: Optional[str] = Field(None, max_length=500)
    # Identidade visual avançada
    border_radius:    Optional[str]             = Field(None, max_length=10)
    spacing:          Optional[SpacingEnum]     = None
    button_style:     Optional[ButtonStyleEnum] = None
    shadow_level:     Optional[ShadowLevelEnum] = None
    layout_type:      Optional[LayoutTypeEnum]  = None
    gradient_enabled: Optional[bool]            = None
    page_overrides:   Optional[dict]            = None

    @field_validator('logo_url_override', 'favicon_url', mode='before')
    @classmethod
    def validate_image_url(cls, v):
        if v and isinstance(v, str) and v.startswith('data:'):
            if not re.match(r'^data:image/(png|jpeg|jpg|gif|webp);base64,', v):
                raise ValueError('Formato de imagem data: não permitido. Use PNG, JPEG, GIF ou WebP.')
        return v

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
