from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum

# ==================== ENUMS ====================

class RoleEnum(str, PyEnum):
    admin = "admin"
    aluno = "aluno"

# ==================== SCHEMAS DE USUÁRIO ====================

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    role: RoleEnum
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
    percentual_presenca_minima: int = Field(default=75, ge=0, le=100)

class CursoCreate(CursoBase):
    pass

class CursoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    percentual_presenca_minima: Optional[int] = None
    ativo: Optional[bool] = None

class CursoResponse(CursoBase):
    id: int
    ativo: bool
    data_criacao: datetime
    
    class Config:
        from_attributes = True

class CursoDetailResponse(CursoResponse):
    data_atualizacao: datetime
    aulas: List['AulaResponse'] = []
    provas: List['ProvaResponse'] = []

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

class ProvaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    tempo_limite_minutos: Optional[int] = None
    tentativas_permitidas: Optional[int] = None
    ativo: Optional[bool] = None

class ProvaResponse(ProvaBase):
    id: int
    curso_id: int
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
    nota_final: Decimal
    percentual_acerto: float
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
ProvaDetailResponse.model_rebuild()
QuestaoDetailResponse.model_rebuild()
