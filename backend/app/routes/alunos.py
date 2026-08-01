import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import InscricaoCurso, Usuario, Curso, Aula, Prova, RoleEnum
from app.schemas import CursoDetailResponse, UsuarioResponse, UsuarioDetailResponse, UsuarioCreate, UsuarioUpdate
from app.routes.auth import get_current_user
from app.security.tenant import TenantContext, tenant_context
from app.services.auth_service import AuthService
from app.services.admin_course_access import get_allowed_course_ids, is_super_or_legacy_admin

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return current_user


def _require_alunos_write(current_user: Usuario = Depends(_require_admin)) -> Usuario:
    # Cadastro/edição/exclusão aqui é direto, sem vínculo a curso — só super
    # admin e admin legado podem (mesma regra de frontend/src/app/core/permissions.ts,
    # token alunos:write). Um instrutor que criasse um aluno por aqui nunca o
    # veria depois: list_alunos restringe instrutor aos alunos matriculados
    # nos cursos que leciona (get_allowed_course_ids), e este endpoint não
    # matricula ninguém em curso nenhum.
    if not is_super_or_legacy_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas super admins podem cadastrar, editar ou excluir alunos diretamente. "
                   "Instrutores devem matricular alunos aprovando solicitações de curso.",
        )
    return current_user


@router.get("", response_model=list[UsuarioDetailResponse])
def list_alunos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """Lista alunos. Filtra pelo tenant do admin autenticado (super_admin vê todos)."""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")

    query = db.query(Usuario).filter(Usuario.role == RoleEnum.aluno)
    query = tc.filter_query(query, Usuario.faculdade_id)

    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            return []
        aluno_ids = {aid for (aid,) in db.query(InscricaoCurso.usuario_id).filter(InscricaoCurso.curso_id.in_(allowed)).distinct().all()}
        query = query.filter(Usuario.id.in_(aluno_ids))

    return query.order_by(Usuario.nome).all()


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_aluno(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(_require_alunos_write),
    tc: TenantContext = Depends(tenant_context),
):
    """Cria um novo aluno (admin)"""
    # Aluno sem faculdade_id fica órfão: invisível em toda listagem filtrada por
    # tenant e 403 em qualquer assert_access. Super admin não tem tenant próprio —
    # precisa estar gerenciando uma instituição (cabeçalho X-Faculdade-Id).
    if tc.faculdade_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível determinar a faculdade do aluno. "
                   "Selecione a instituição que está gerenciando ou use "
                   "POST /api/faculdades/{faculdade_id}/alunos.",
        )

    existing = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    if usuario_data.cpf_rg:
        dup = db.query(Usuario).filter(Usuario.cpf_rg == usuario_data.cpf_rg).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF/RG já cadastrado")

    if usuario_data.numero_matricula:
        dup = db.query(Usuario).filter(Usuario.numero_matricula == usuario_data.numero_matricula).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Número de matrícula já cadastrado")

    novo = AuthService.create_user(
        db=db,
        email=usuario_data.email,
        nome=usuario_data.nome,
        senha=usuario_data.senha,
        role="aluno",
        data_nascimento=usuario_data.data_nascimento,
        sexo=usuario_data.sexo,
        cpf_rg=usuario_data.cpf_rg,
        endereco=usuario_data.endereco,
        cep=usuario_data.cep,
        telefone=usuario_data.telefone,
        nome_responsavel=usuario_data.nome_responsavel,
        numero_matricula=usuario_data.numero_matricula,
        turma=usuario_data.turma,
        historico_escolar=usuario_data.historico_escolar,
        faculdade_id=tc.faculdade_id,
    )
    return novo


@router.get("/{aluno_id}", response_model=UsuarioDetailResponse)
def get_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """Obtém detalhes de um aluno (admin)"""
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")

    aluno = db.query(Usuario).filter(Usuario.id == aluno_id, Usuario.role == RoleEnum.aluno).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aluno_id} não encontrado")

    tc.assert_access(aluno.faculdade_id)

    allowed = get_allowed_course_ids(db, current_user)
    if allowed is not None:
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não possui permissão para acessar este aluno")
        enrolled = db.query(InscricaoCurso).filter(
            InscricaoCurso.usuario_id == aluno_id,
            InscricaoCurso.curso_id.in_(allowed)
        ).first()
        if not enrolled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não possui permissão para acessar este aluno")
    return aluno


@router.put("/{aluno_id}", response_model=UsuarioDetailResponse)
def update_aluno(
    aluno_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(_require_alunos_write),
    tc: TenantContext = Depends(tenant_context),
):
    """Atualiza informações de um aluno (admin)"""
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id, Usuario.role == RoleEnum.aluno).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aluno_id} não encontrado")

    tc.assert_access(aluno.faculdade_id)

    if dados.nome is not None:
        aluno.nome = dados.nome
    if dados.email is not None:
        conflict = db.query(Usuario).filter(Usuario.email == dados.email, Usuario.id != aluno_id).first()
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
        dup = db.query(Usuario).filter(Usuario.cpf_rg == dados.cpf_rg, Usuario.id != aluno_id).first()
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
        dup = db.query(Usuario).filter(Usuario.numero_matricula == dados.numero_matricula, Usuario.id != aluno_id).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Número de matrícula já cadastrado")
        aluno.numero_matricula = dados.numero_matricula
    if dados.turma is not None:
        aluno.turma = dados.turma
    if dados.historico_escolar is not None:
        aluno.historico_escolar = dados.historico_escolar

    db.commit()
    db.refresh(aluno)
    return aluno


@router.delete("/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(_require_alunos_write),
    tc: TenantContext = Depends(tenant_context),
):
    """Deleta um aluno (admin)"""
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id, Usuario.role == RoleEnum.aluno).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aluno_id} não encontrado")

    tc.assert_access(aluno.faculdade_id)

    db.delete(aluno)
    db.commit()
    return None

@router.get("/{aluno_id}/cursos", response_model=list[CursoDetailResponse])
def get_cursos_aluno(
    aluno_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Lista os cursos em que o aluno está inscrito, com aulas e provas.

    O próprio aluno vê os seus; admins veem os de alunos do mesmo tenant.
    """
    aluno = db.query(Usuario).filter(Usuario.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Aluno {aluno_id} não encontrado")

    if current_user.id != aluno_id:
        if current_user.role != RoleEnum.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode consultar os seus próprios cursos",
            )
        tc.assert_access(aluno.faculdade_id)

    inscricoes = (
        db.query(InscricaoCurso)
        .options(
            joinedload(InscricaoCurso.curso).joinedload(Curso.aulas),
            joinedload(InscricaoCurso.curso).joinedload(Curso.provas),
        )
        .filter(InscricaoCurso.usuario_id == aluno_id)
        .all()
    )

    cursos = []
    for inscricao in inscricoes:
        if not inscricao.curso:
            continue
        cursos.append(CursoDetailResponse.model_validate(inscricao.curso))

    logger.debug("get_cursos_aluno aluno_id=%s retornou %d curso(s)", aluno_id, len(cursos))
    return cursos
