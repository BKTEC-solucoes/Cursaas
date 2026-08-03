"""
Os três cargos administrativos: super admin, admin da faculdade e instrutor.

Cobre a fronteira que separa "gerencia a instituição" de "produz conteúdo" e o
recorte de tenant das rotas que ainda não usam ``TenantContext`` (as
solicitações de cadastro). Tudo lógica pura — sem banco e sem servidor.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import AdminRoleEnum, RoleEnum
from app.routes.cadastro import _assert_solicitacao_no_escopo, _escopo_do_gestor
from app.services.admin_course_access import get_allowed_course_ids, pode_gerenciar_faculdade


def _admin(admin_role, faculdade_id=1):
    return SimpleNamespace(role=RoleEnum.admin, admin_role=admin_role, faculdade_id=faculdade_id)


def _request(escopo: str | None = None):
    headers = {"X-Faculdade-Id": escopo} if escopo is not None else {}
    return SimpleNamespace(headers=headers)


# ── Quem gerencia a instituição ───────────────────────────────────────────────

@pytest.mark.parametrize("admin_role", [
    AdminRoleEnum.super_admin,
    AdminRoleEnum.admin_faculdade,
    None,  # admin legado, anterior à coluna
])
def test_cargos_de_gestao_gerenciam_a_faculdade(admin_role):
    assert pode_gerenciar_faculdade(_admin(admin_role)) is True


def test_instrutor_nao_gerencia_a_faculdade():
    """Instrutor cria conteúdo; alunos, admins, tema e solicitações não são dele."""
    assert pode_gerenciar_faculdade(_admin(AdminRoleEnum.instrutor)) is False


def test_aluno_nunca_gerencia_a_faculdade():
    aluno = SimpleNamespace(role=RoleEnum.aluno, admin_role=None, faculdade_id=1)
    assert pode_gerenciar_faculdade(aluno) is False


def test_admin_da_faculdade_ve_todos_os_cursos_do_tenant():
    """
    `None` = sem restrição por autoria. O recorte por faculdade continua sendo
    do TenantContext — é o instrutor que fica preso aos próprios cursos.
    """
    faculdade_aprovada = SimpleNamespace(aprovada=True)

    class _DbFake:
        def query(self, *_):
            return self

        def filter(self, *_):
            return self

        def first(self):
            return faculdade_aprovada

    admin = _admin(AdminRoleEnum.admin_faculdade)
    admin.instituicao_id = None

    assert get_allowed_course_ids(_DbFake(), admin) is None


# ── Escopo das solicitações de cadastro ───────────────────────────────────────

def test_super_admin_usa_o_escopo_do_painel():
    gestor = _admin(AdminRoleEnum.super_admin, faculdade_id=None)
    assert _escopo_do_gestor(_request("4"), gestor) == 4


def test_super_admin_sem_escopo_ve_tudo():
    gestor = _admin(AdminRoleEnum.super_admin, faculdade_id=None)
    assert _escopo_do_gestor(_request(), gestor) is None


def test_admin_da_faculdade_ignora_o_cabecalho_de_escopo():
    """O cabeçalho é conveniência de UI: para quem tem vínculo não amplia nada."""
    gestor = _admin(AdminRoleEnum.admin_faculdade, faculdade_id=7)
    assert _escopo_do_gestor(_request("99"), gestor) == 7


def test_admin_da_faculdade_nao_filtra_por_outra_faculdade():
    gestor = _admin(AdminRoleEnum.admin_faculdade, faculdade_id=7)

    with pytest.raises(HTTPException) as exc:
        _escopo_do_gestor(_request(), gestor, faculdade_id=99)

    assert exc.value.status_code == 403


def test_admin_da_faculdade_nao_age_sobre_solicitacao_de_outra():
    gestor = _admin(AdminRoleEnum.admin_faculdade, faculdade_id=7)
    solicitacao = SimpleNamespace(faculdade_id=99)

    with pytest.raises(HTTPException) as exc:
        _assert_solicitacao_no_escopo(solicitacao, gestor)

    assert exc.value.status_code == 403


def test_super_admin_age_sobre_qualquer_solicitacao():
    gestor = _admin(AdminRoleEnum.super_admin, faculdade_id=None)
    _assert_solicitacao_no_escopo(SimpleNamespace(faculdade_id=99), gestor)
