from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, DECIMAL, BigInteger, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class RoleEnum(str, enum.Enum):
    admin = "admin"
    aluno = "aluno"

class StatusVideoEnum(str, enum.Enum):
    processando = "processando"
    disponivel = "disponivel"
    erro = "erro"

class TipoQuestaoEnum(str, enum.Enum):
    multipla_escolha = "multipla_escolha"
    dissertativa = "dissertativa"

class StatusSolicitacaoEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class StatusCursoEnum(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    recusado = "recusado"

# Tabela de Usuários
class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.aluno, nullable=False, index=True)
    ativo = Column(Boolean, default=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    inscricoes = relationship("InscricaoCurso", back_populates="usuario", cascade="all, delete-orphan")
    solicitacoes_cursos = relationship("CourseRequest", back_populates="usuario", cascade="all, delete-orphan")
    presencas = relationship("Presenca", back_populates="usuario", cascade="all, delete-orphan")
    respostas = relationship("Resposta", back_populates="usuario", cascade="all, delete-orphan")
    notas = relationship("Nota", back_populates="usuario", cascade="all, delete-orphan")
    notas_cursos = relationship("NotaCurso", back_populates="usuario", cascade="all, delete-orphan")

# Tabela de Cursos
class Curso(Base):
    __tablename__ = "cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)
    pago = Column(Boolean, default=False, nullable=False, index=True)
    valor = Column(DECIMAL(10, 2), nullable=True)
    status = Column(Enum(StatusCursoEnum), default=StatusCursoEnum.aprovado, nullable=False, index=True)
    percentual_presenca_minima = Column(Integer, default=75)
    ativo = Column(Boolean, default=True, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    inscricoes = relationship("InscricaoCurso", back_populates="curso", cascade="all, delete-orphan")
    solicitacoes = relationship("CourseRequest", back_populates="curso", cascade="all, delete-orphan")
    aulas = relationship("Aula", back_populates="curso", cascade="all, delete-orphan")
    provas = relationship("Prova", back_populates="curso", cascade="all, delete-orphan")
    notas_cursos = relationship("NotaCurso", back_populates="curso", cascade="all, delete-orphan")

# Tabela de Inscrições em Cursos
class InscricaoCurso(Base):
    __tablename__ = "inscricoes_cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    data_inscricao = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (UniqueConstraint('usuario_id', 'curso_id', name='unique_inscricao'),)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="inscricoes")
    curso = relationship("Curso", back_populates="inscricoes")

# Tabela de Solicitações de Acesso a Cursos Pagos
class CourseRequest(Base):
    __tablename__ = "course_requests"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(StatusSolicitacaoEnum), default=StatusSolicitacaoEnum.pending, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("usuario_id", "curso_id", name="unique_course_request"),
    )

    usuario = relationship("Usuario", back_populates="solicitacoes_cursos")
    curso = relationship("Curso", back_populates="solicitacoes")

# Tabela de Aulas
class Aula(Base):
    __tablename__ = "aulas"
    
    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text)
    data_aula = Column(DateTime, nullable=False, index=True)
    duracao_minutos = Column(Integer)
    ativo = Column(Boolean, default=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    curso = relationship("Curso", back_populates="aulas")
    videos = relationship("Video", back_populates="aula", cascade="all, delete-orphan")
    presencas = relationship("Presenca", back_populates="aula", cascade="all, delete-orphan")

# Tabela de Vídeos
class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    aula_id = Column(Integer, ForeignKey("aulas.id", ondelete="CASCADE"), nullable=False, index=True)
    arquivo_nome = Column(String(255), nullable=False)
    caminho_arquivo = Column(String(500), nullable=False)
    tamanho_bytes = Column(BigInteger)
    duracao_segundos = Column(Integer)
    formato = Column(String(50))
    status = Column(Enum(StatusVideoEnum), default=StatusVideoEnum.disponivel, index=True)
    data_upload = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (UniqueConstraint('aula_id', name='unique_aula_video'),)
    
    # Relacionamentos
    aula = relationship("Aula", back_populates="videos")

# Tabela de Presença
class Presenca(Base):
    __tablename__ = "presenca"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    aula_id = Column(Integer, ForeignKey("aulas.id", ondelete="CASCADE"), nullable=False, index=True)
    percentual_assistido = Column(Integer, default=0)
    registrada_automaticamente = Column(Boolean, default=False, index=True)
    tempo_total_segundos = Column(Integer, default=0)
    data_acesso = Column(DateTime, default=datetime.utcnow)
    data_conclusao = Column(DateTime)
    
    __table_args__ = (UniqueConstraint('usuario_id', 'aula_id', name='unique_presenca'),)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="presencas")
    aula = relationship("Aula", back_populates="presencas")

# Tabela de Provas
class Prova(Base):
    __tablename__ = "provas"
    
    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text)
    data_inicio = Column(DateTime, nullable=False, index=True)
    data_fim = Column(DateTime, nullable=False)
    tempo_limite_minutos = Column(Integer)
    tentativas_permitidas = Column(Integer, default=1)
    ativo = Column(Boolean, default=True, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    curso = relationship("Curso", back_populates="provas")
    questoes = relationship("Questao", back_populates="prova", cascade="all, delete-orphan")
    respostas = relationship("Resposta", back_populates="prova", cascade="all, delete-orphan")
    notas = relationship("Nota", back_populates="prova", cascade="all, delete-orphan")

# Tabela de Questões
class Questao(Base):
    __tablename__ = "questoes"
    
    id = Column(Integer, primary_key=True, index=True)
    prova_id = Column(Integer, ForeignKey("provas.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(Enum(TipoQuestaoEnum), default=TipoQuestaoEnum.multipla_escolha)
    enunciado = Column(Text, nullable=False)
    ordem = Column(Integer, index=True)
    pontos = Column(DECIMAL(5, 2), default=1.00)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    prova = relationship("Prova", back_populates="questoes")
    opcoes = relationship("OpcaoResposta", back_populates="questao", cascade="all, delete-orphan")
    respostas = relationship("Resposta", back_populates="questao", cascade="all, delete-orphan")

# Tabela de Opções de Resposta
class OpcaoResposta(Base):
    __tablename__ = "opcoes_resposta"
    
    id = Column(Integer, primary_key=True, index=True)
    questao_id = Column(Integer, ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False, index=True)
    texto = Column(Text, nullable=False)
    correta = Column(Boolean, default=False)
    ordem = Column(Integer, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    questao = relationship("Questao", back_populates="opcoes")
    respostas = relationship("Resposta", back_populates="opcao")

# Tabela de Respostas
class Resposta(Base):
    __tablename__ = "respostas"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    prova_id = Column(Integer, ForeignKey("provas.id", ondelete="CASCADE"), nullable=False, index=True)
    questao_id = Column(Integer, ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False, index=True)
    texto_resposta = Column(Text)
    opcao_id = Column(Integer, ForeignKey("opcoes_resposta.id", ondelete="SET NULL"))
    correta = Column(Boolean)
    data_resposta = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="respostas")
    prova = relationship("Prova", back_populates="respostas")
    questao = relationship("Questao", back_populates="respostas")
    opcao = relationship("OpcaoResposta", back_populates="respostas")

# Tabela de Notas
class Nota(Base):
    __tablename__ = "notas"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    prova_id = Column(Integer, ForeignKey("provas.id", ondelete="CASCADE"), nullable=False, index=True)
    nota_final = Column(DECIMAL(5, 2), index=True)
    tentativa = Column(Integer, default=1)
    data_submissao = Column(DateTime)
    data_correcao = Column(DateTime)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="notas")
    prova = relationship("Prova", back_populates="notas")

# Tabela de Notas de Cursos
class NotaCurso(Base):
    __tablename__ = "notas_cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    media_final = Column(DECIMAL(5, 2))
    aprovado = Column(Boolean, index=True)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (UniqueConstraint('usuario_id', 'curso_id', name='unique_nota_curso'),)
    
    # Relacionamentos
    usuario = relationship("Usuario", back_populates="notas_cursos")
    curso = relationship("Curso", back_populates="notas_cursos")
