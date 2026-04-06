from pydantic import BaseModel, EmailStr, Field, computed_field, model_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum as PyEnum

# ==================== ENUMS ====================

class RoleEnum(str, PyEnum):
    admin = "admin"
    aluno = "aluno"

class AdminRoleEnum(str, PyEnum):
    super_admin = "super_admin"
    instrutor   = "instrutor"
    financeiro  = "financeiro"
    suporte     = "suporte"

class CourseRequestStatusEnum(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class StatusCursoEnum(str, PyEnum):
    pendente = "pendente"
    aprovado = "aprovado"
    recusado = "recusado"

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
    """Schema para registro simplificado de alunos (apenas nome, email, senha)"""
    nome: str = Field(..., min_length=1)
    email: EmailStr
    senha: str = Field(..., min_length=6)


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

# ==================== SCHEMAS DE INSTITUIÇÃO ====================

class InstituicaoBase(BaseModel):
    nome_instituicao: str = Field(..., min_length=1)
    cnpj: str = Field(..., min_length=14, max_length=18)
    contato: str = Field(..., min_length=10)
    endereco: str = Field(..., min_length=1)

class InstituicaoCreate(InstituicaoBase):
    email: EmailStr
    nome_responsavel: Optional[str] = Field(default=None, min_length=1)
    senha: str = Field(..., min_length=6)

class InstituicaoUpdate(BaseModel):
    nome_instituicao: Optional[str] = None
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    endereco: Optional[str] = None
    ativo: Optional[bool] = None
    aprovada: Optional[bool] = None
    motivo_rejeicao: Optional[str] = None
    observacoes: Optional[str] = None

class InstituicaoResponse(InstituicaoBase):
    id: int
    ativo: bool
    aprovada: bool
    motivo_rejeicao: Optional[str] = None
    observacoes: Optional[str] = None
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class InstituicaoDetailResponse(InstituicaoResponse):
    data_atualizacao: datetime

# Update forward references
AulaResponse.model_rebuild()
AulaDetailResponse.model_rebuild()
CursoDetailResponse.model_rebuild()
ProvaCreate.model_rebuild()
ProvaUpdate.model_rebuild()
ProvaDetailResponse.model_rebuild()
QuestaoDetailResponse.model_rebuild()
