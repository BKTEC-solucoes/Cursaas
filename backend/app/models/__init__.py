from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, Enum, ForeignKey, DECIMAL, BigInteger, UniqueConstraint, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base


# ---------------------------------------------------------------------------
# MULTI-TENANT: Faculdade
# ---------------------------------------------------------------------------

class PlanoFaculdadeEnum(str, enum.Enum):
    basico        = "basico"
    profissional  = "profissional"
    enterprise    = "enterprise"


class VinculoStatusEnum(str, enum.Enum):
    ativo     = "ativo"
    suspenso  = "suspenso"
    desligado = "desligado"


class Faculdade(Base):
    """Representa um tenant (faculdade/instituição de ensino)."""
    __tablename__ = "faculdades"

    id               = Column(Integer, primary_key=True, index=True)
    nome             = Column(String(255), nullable=False)
    slug             = Column(String(100), unique=True, nullable=False, index=True)
    cnpj             = Column(String(18), unique=True, nullable=True)
    email_contato    = Column(String(255), nullable=True)
    telefone         = Column(String(20), nullable=True)
    logo_url         = Column(String(500), nullable=True)
    dominio_email    = Column(String(100), nullable=True,
                              comment="Domínio de e-mail para auto-vínculo, ex: @faculdade.edu.br")
    ativa            = Column(Boolean, default=True, nullable=False, index=True)
    aprovada         = Column(Boolean, default=True, nullable=False, index=True)
    plano            = Column(Enum(PlanoFaculdadeEnum), default=PlanoFaculdadeEnum.basico, nullable=False)
    data_criacao     = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # FK para o tema ativo (pode ser NULL se nenhum tema criado ainda)
    tema_ativo_id    = Column(Integer, ForeignKey("faculdade_temas.id", use_alter=True,
                              name="fk_faculdades_tema_ativo", ondelete="SET NULL"), nullable=True)

    # Relacionamentos reversos
    usuarios          = relationship("Usuario",               back_populates="faculdade",  lazy="dynamic")
    cursos            = relationship("Curso",                 back_populates="faculdade",  lazy="dynamic")
    vinculos_alunos   = relationship("VinculoAlunoFaculdade", back_populates="faculdade",  cascade="all, delete-orphan")
    temas             = relationship("FaculdadeTema",         back_populates="faculdade",
                                     foreign_keys="FaculdadeTema.faculdade_id",
                                     cascade="all, delete-orphan")
    tema_ativo        = relationship("FaculdadeTema",         foreign_keys=[tema_ativo_id],
                                     post_update=True)


class SpacingEnum(str, enum.Enum):
    compact     = "compact"
    comfortable = "comfortable"
    spacious    = "spacious"

class ButtonStyleEnum(str, enum.Enum):
    rounded = "rounded"
    square  = "square"
    pill    = "pill"

class ShadowLevelEnum(str, enum.Enum):
    none   = "none"
    soft   = "soft"
    strong = "strong"

class LayoutTypeEnum(str, enum.Enum):
    topbar  = "topbar"
    sidebar = "sidebar"

class ContentWidthEnum(str, enum.Enum):
    full  = "full"   # ocupa 100% da viewport
    boxed = "boxed"  # max-width centralizado (padrão: 1400px)

class AnimIntensityEnum(str, enum.Enum):
    none       = "none"       # sem animações/transições
    reduced    = "reduced"    # suave — acessível
    normal     = "normal"     # padrão
    expressive = "expressive" # pronunciado — destaque

class TransitionTypeEnum(str, enum.Enum):
    instant = "instant"  # snap imediato (0ms)
    fade    = "fade"     # ease suave (padrão)
    slide   = "slide"    # ease-out físico
    spring  = "spring"   # cubic-bezier com overshoot


class FaculdadeTema(Base):
    """Tema visual white-label de um tenant. Relação 1:N com Faculdade."""
    __tablename__ = "faculdade_temas"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    faculdade_id     = Column(Integer, ForeignKey("faculdades.id", ondelete="CASCADE", onupdate="CASCADE"),
                              nullable=False, index=True)
    nome             = Column(String(100), nullable=False, default="Tema Padrão")

    # ── Cores — modo claro ────────────────────────────────────────────────────
    primary_color    = Column(String(20),  nullable=False, default="#1a6b3c")
    secondary_color  = Column(String(20),  nullable=False, default="#0f4b2a")
    background_color = Column(String(20),  nullable=False, default="#f0fdf4")
    font_family      = Column(String(150), nullable=False, default="Inter, system-ui, sans-serif")
    logo_url_override = Column(Text, nullable=True,
                               comment="Override de logo; se NULL usa faculdades.logo_url")

    # ── Dark mode ─────────────────────────────────────────────────────────────
    dark_mode             = Column(Boolean, nullable=False, default=False)
    dark_primary_color    = Column(String(20), nullable=False, default="#34d399")
    dark_secondary_color  = Column(String(20), nullable=False, default="#10b981")
    dark_background_color = Column(String(20), nullable=False, default="#0d1a14")

    # ── Favicon ───────────────────────────────────────────────────────────────
    favicon_url      = Column(Text, nullable=True)

    # ── Identidade visual avançada ────────────────────────────────────────────
    border_radius    = Column(String(10),  nullable=False, default="8px",
                              comment="Raio de borda global (ex: 4px, 8px, 12px, 50%)")
    spacing          = Column(Enum(SpacingEnum),     nullable=False, default=SpacingEnum.comfortable)
    button_style     = Column(Enum(ButtonStyleEnum), nullable=False, default=ButtonStyleEnum.rounded)
    shadow_level     = Column(Enum(ShadowLevelEnum), nullable=False, default=ShadowLevelEnum.soft)
    layout_type      = Column(Enum(LayoutTypeEnum),      nullable=False, default=LayoutTypeEnum.topbar)
    content_width    = Column(Enum(ContentWidthEnum),    nullable=False, default=ContentWidthEnum.boxed,
                              comment="Largura do conteúdo: full ou boxed")
    sidebar_collapsible = Column(Boolean, nullable=False, default=True,
                                 comment="Se true, sidebar pode ser recolhida para ícones pelo usuário")
    anim_intensity  = Column(Enum(AnimIntensityEnum),  nullable=False, default=AnimIntensityEnum.normal,
                             comment="Intensidade das microinterações: none | reduced | normal | expressive")
    transition_type = Column(Enum(TransitionTypeEnum), nullable=False, default=TransitionTypeEnum.fade,
                             comment="Curva de transição: instant | fade | slide | spring")
    gradient_enabled = Column(Boolean, nullable=False, default=False)

    # ── Overrides por página ─────────────────────────────────────────────────
    # Estrutura: { "dashboard": {primary_color, secondary_color, ...}, "alunos": {...} }
    # Campos suportados por override: primary_color, secondary_color, background_color,
    #   border_radius, button_style, shadow_level, gradient_enabled
    page_overrides   = Column(JSON, nullable=True,
                              comment="Overrides visuais por página: dashboard, alunos, cursos, aulas, notas, perfil")

    # ── Tela de login ─────────────────────────────────────────────────────────
    login_layout           = Column(String(20),  nullable=False, default="centered",
                                    comment="Layout: centered | split-left | split-right")
    login_background_type  = Column(String(20),  nullable=False, default="gradient",
                                    comment="Tipo de background do painel: gradient | color | image")
    login_background_value = Column(String(500), nullable=True,
                                    comment="Hex ou URL de imagem; NULL = derivar de primary/secondary")
    login_message_title    = Column(String(120), nullable=True,
                                    comment="Título do painel de branding; NULL = nome da faculdade")
    login_message_body     = Column(String(300), nullable=True,
                                    comment="Subtítulo/mensagem do painel; NULL = texto padrão")

    criado_em     = Column(DateTime, server_default=func.now(), nullable=False)
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    faculdade = relationship("Faculdade", back_populates="temas",
                             foreign_keys=[faculdade_id])


class TemaPreset(Base):
    """Presets de tema para seleção rápida. Somente leitura via seed."""
    __tablename__ = "tema_presets"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    nome                  = Column(String(100), nullable=False)
    preview_color         = Column(String(20),  nullable=False)
    primary_color         = Column(String(20),  nullable=False)
    secondary_color       = Column(String(20),  nullable=False)
    background_color      = Column(String(20),  nullable=False)
    font_family           = Column(String(150), nullable=False, default="Inter, system-ui, sans-serif")
    dark_primary_color    = Column(String(20),  nullable=False, default="#34d399")
    dark_secondary_color  = Column(String(20),  nullable=False, default="#10b981")
    dark_background_color = Column(String(20),  nullable=False, default="#0d1a14")


class VinculoAlunoFaculdade(Base):
    """Matrícula + status do vínculo de um aluno em uma faculdade."""
    __tablename__ = "vinculos_aluno_faculdade"

    id               = Column(Integer, primary_key=True, index=True)
    usuario_id       = Column(Integer, ForeignKey("usuarios.id",   ondelete="CASCADE"),  nullable=False, index=True)
    faculdade_id     = Column(Integer, ForeignKey("faculdades.id", ondelete="CASCADE"),  nullable=False, index=True)
    matricula        = Column(String(50), nullable=True)
    status           = Column(Enum(VinculoStatusEnum), default=VinculoStatusEnum.ativo, nullable=False)
    data_vinculo     = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("usuario_id", "faculdade_id", name="uq_vinculo_usuario_faculdade"),
    )

    usuario   = relationship("Usuario",    back_populates="vinculos_faculdades")
    faculdade = relationship("Faculdade",  back_populates="vinculos_alunos")

class RoleEnum(str, enum.Enum):
    admin      = "admin"
    aluno      = "aluno"
    instituicao = "instituicao"

class AdminRoleEnum(str, enum.Enum):
    """
    Sub-papel de ``role='admin'``. Três cargos, do mais amplo ao mais estreito:

        super_admin ...... a plataforma inteira: todas as instituições, o menu
                           Sistema e o cadastro de outros super admins.
        admin_faculdade .. uma instituição: cursos, aulas, provas, notas,
                           presença, alunos, tema e os administradores dela.
                           Não cria instituição nem super admin.
        instrutor ........ conteúdo: cursos, aulas e provas, restrito aos
                           cursos que criou ou que lhe foram vinculados.

    ``NULL`` é um quarto estado, legado — admin anterior à coluna, tratado
    como admin da faculdade (ver ``services/admin_course_access.py``).
    """
    super_admin     = "super_admin"
    admin_faculdade = "admin_faculdade"
    instrutor       = "instrutor"

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

class StatusInstituicaoEnum(str, enum.Enum):
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
    admin_role = Column(Enum(AdminRoleEnum), nullable=True, index=True)
    foto_perfil = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Dados pessoais
    data_nascimento = Column(Date, nullable=True)
    sexo = Column(String(20), nullable=True)
    cpf_rg = Column(String(30), nullable=True, unique=True, index=True)
    # Endereço e contato
    endereco = Column(String(500), nullable=True)
    cep = Column(String(10), nullable=True)
    telefone = Column(String(20), nullable=True)
    instituicao_id = Column(Integer, ForeignKey("instituicoes.id", ondelete="SET NULL"), nullable=True, index=True)
    faculdade_id   = Column(Integer, ForeignKey("faculdades.id",  ondelete="RESTRICT"),  nullable=True, index=True)
    # Responsável
    nome_responsavel = Column(String(255), nullable=True)
    # Dados escolares
    numero_matricula = Column(String(50), nullable=True, unique=True, index=True)
    turma = Column(String(100), nullable=True)
    historico_escolar = Column(Text, nullable=True)
    
    # Relacionamentos
    inscricoes = relationship("InscricaoCurso", back_populates="usuario", cascade="all, delete-orphan")
    admin_cursos = relationship("AdminCurso", back_populates="admin", cascade="all, delete-orphan")
    solicitacoes_cursos = relationship("CourseRequest", back_populates="usuario", cascade="all, delete-orphan")
    presencas = relationship("Presenca", back_populates="usuario", cascade="all, delete-orphan")
    respostas = relationship("Resposta", back_populates="usuario", cascade="all, delete-orphan")
    notas = relationship("Nota", back_populates="usuario", cascade="all, delete-orphan")
    notas_cursos = relationship("NotaCurso", back_populates="usuario", cascade="all, delete-orphan")
    instituicao = relationship("Instituicao", foreign_keys=[instituicao_id], back_populates="usuarios")
    faculdade   = relationship("Faculdade",   foreign_keys=[faculdade_id],  back_populates="usuarios")
    vinculos_faculdades = relationship("VinculoAlunoFaculdade", back_populates="usuario", cascade="all, delete-orphan")

# Tabela de Cursos
class Curso(Base):
    __tablename__ = "cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    faculdade_id = Column(Integer, ForeignKey("faculdades.id", ondelete="RESTRICT"), nullable=True, index=True)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)
    pago = Column(Boolean, default=False, nullable=False, index=True)
    valor = Column(DECIMAL(10, 2), nullable=True)
    status = Column(Enum(StatusCursoEnum), default=StatusCursoEnum.aprovado, nullable=False, index=True)
    percentual_presenca_minima = Column(Integer, default=75)
    ativo = Column(Boolean, default=True, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    criado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    criado_por = relationship("Usuario",    foreign_keys=[criado_por_id], backref="cursos_criados")
    faculdade  = relationship("Faculdade",  foreign_keys=[faculdade_id],  back_populates="cursos")
    inscricoes = relationship("InscricaoCurso", back_populates="curso", cascade="all, delete-orphan")
    admins_vinculados = relationship("AdminCurso", back_populates="curso", cascade="all, delete-orphan")
    solicitacoes = relationship("CourseRequest", back_populates="curso", cascade="all, delete-orphan")
    aulas = relationship("Aula", back_populates="curso", cascade="all, delete-orphan")
    provas = relationship("Prova", back_populates="curso", cascade="all, delete-orphan")
    notas_cursos = relationship("NotaCurso", back_populates="curso", cascade="all, delete-orphan")


class ConviteAdmin(Base):
    """Token de convite para cadastro de administrador via link."""
    __tablename__ = "convites_admin"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    admin_role = Column(Enum(AdminRoleEnum), nullable=False, default=AdminRoleEnum.instrutor)
    # Faculdade em que o admin convidado vai nascer. NULL só em convites antigos:
    # sem ela a conta criada fica órfã (sem tenant) e não enxerga nada.
    faculdade_id = Column(Integer, ForeignKey("faculdades.id", ondelete="CASCADE"), nullable=True, index=True)
    # quem enviou o convite
    convidado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    # controle de estado
    usado = Column(Boolean, default=False, nullable=False)
    data_criacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_expiracao = Column(DateTime, nullable=False)
    data_uso = Column(DateTime, nullable=True)

    convidado_por = relationship("Usuario", foreign_keys=[convidado_por_id])
    faculdade = relationship("Faculdade", foreign_keys=[faculdade_id])


class AdminCurso(Base):
    __tablename__ = "admin_cursos"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    data_vinculo = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('admin_id', 'curso_id', name='unique_admin_curso'),)

    admin = relationship("Usuario", back_populates="admin_cursos")
    curso = relationship("Curso", back_populates="admins_vinculados")

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
    faculdade_id = Column(Integer, ForeignKey("faculdades.id", ondelete="RESTRICT"), nullable=True, index=True)
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



# Tabela de Instituições
class Instituicao(Base):
    __tablename__ = "instituicoes"

    id = Column(Integer, primary_key=True, index=True)
    nome_instituicao = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False, index=True)
    contato = Column(String(255), nullable=False)
    endereco = Column(String(500), nullable=False)
    ativa = Column(Boolean, default=False, nullable=False, index=True)
    aprovada = Column(Boolean, default=False, nullable=False, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relacionamentos
    usuarios = relationship("Usuario", back_populates="instituicao", cascade="all, delete-orphan")


# =============================================================================
# Solicitação de Cadastro
# Fila de aprovação: candidato se auto-cadastra aqui.
# O aluno real só é criado em `usuarios` após aprovação pelo super admin.
# =============================================================================

class SolicitacaoStatusEnum(str, enum.Enum):
    pendente  = "pendente"
    aprovada  = "aprovada"
    recusada  = "recusada"


class SolicitacaoCadastro(Base):
    __tablename__ = "solicitacoes_cadastro"

    id               = Column(Integer, primary_key=True, index=True)

    # Dados informados pelo candidato
    nome             = Column(String(255), nullable=False)
    email            = Column(String(255), nullable=False, index=True)
    telefone         = Column(String(20),  nullable=True)
    cpf_rg           = Column(String(30),  nullable=True)
    mensagem         = Column(Text,        nullable=True)

    # Tenant desejado
    faculdade_id     = Column(Integer, ForeignKey("faculdades.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Ciclo de vida
    status           = Column(Enum(SolicitacaoStatusEnum), default=SolicitacaoStatusEnum.pendente, nullable=False, index=True)
    motivo_recusa    = Column(Text, nullable=True)

    # Referência ao usuário criado na aprovação
    usuario_id       = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    # Auditoria
    criado_em        = Column(DateTime, default=datetime.utcnow, nullable=False)
    revisado_em      = Column(DateTime, nullable=True)
    revisado_por_id  = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("email", "faculdade_id", name="uq_solicitacao_email_faculdade"),
    )

    faculdade    = relationship("Faculdade", foreign_keys=[faculdade_id])
    usuario      = relationship("Usuario",   foreign_keys=[usuario_id])
    revisado_por = relationship("Usuario",   foreign_keys=[revisado_por_id])
