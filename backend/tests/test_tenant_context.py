"""
TenantContext — o invariante central do multi-tenant.

Estes testes cobrem os TRÊS estados possíveis. O bug historico tratava
"sem tenant" como "super admin", entregando todos os tenants a qualquer conta
órfã (admin criado por convite, aluno não aprovado, conta legada).

Sem banco: TenantContext é lógica pura sobre um faculdade_id e uma flag.
"""
import pytest
from fastapi import HTTPException

from app.security.tenant import TenantContext


# ── Fábricas dos três estados ────────────────────────────────────────────────

def super_admin() -> TenantContext:
    return TenantContext(faculdade_id=None, is_super_admin=True)


def do_tenant(fid: int = 1) -> TenantContext:
    return TenantContext(faculdade_id=fid, is_super_admin=False)


def orfao() -> TenantContext:
    """Sem tenant e sem ser super admin — o estado do bug."""
    return TenantContext(faculdade_id=None, is_super_admin=False)


# ── assert_access ────────────────────────────────────────────────────────────

def test_super_admin_acessa_qualquer_tenant():
    tc = super_admin()
    tc.assert_access(1)
    tc.assert_access(2)
    tc.assert_access(None)


def test_usuario_do_tenant_acessa_o_proprio():
    do_tenant(1).assert_access(1)


def test_usuario_do_tenant_bloqueado_em_outro():
    with pytest.raises(HTTPException) as exc:
        do_tenant(1).assert_access(2)
    assert exc.value.status_code == 403


def test_usuario_do_tenant_bloqueado_em_recurso_orfao():
    """Recurso com faculdade_id NULL não pertence a ninguém."""
    with pytest.raises(HTTPException) as exc:
        do_tenant(1).assert_access(None)
    assert exc.value.status_code == 403


@pytest.mark.parametrize("recurso", [1, 2, None])
def test_orfao_nao_acessa_nada(recurso):
    """
    Inclui recurso=None: sem a checagem explícita de faculdade_id, o
    `None != None` seria False e o acesso passaria.
    """
    with pytest.raises(HTTPException) as exc:
        orfao().assert_access(recurso)
    assert exc.value.status_code == 403


# ── require_tenant ───────────────────────────────────────────────────────────

def test_require_tenant_devolve_o_id():
    assert do_tenant(7).require_tenant() == 7


@pytest.mark.parametrize("tc", [super_admin(), orfao()])
def test_require_tenant_rejeita_quem_nao_tem(tc):
    with pytest.raises(HTTPException) as exc:
        tc.require_tenant()
    assert exc.value.status_code == 403


# ── stamp ────────────────────────────────────────────────────────────────────

class _Linha:
    faculdade_id = None


def test_stamp_marca_o_tenant_do_criador():
    obj = _Linha()
    do_tenant(3).stamp(obj)
    assert obj.faculdade_id == 3


def test_stamp_nao_marca_para_super_admin():
    """Super admin não tem tenant próprio; a rota exige faculdade_id no payload."""
    obj = _Linha()
    super_admin().stamp(obj)
    assert obj.faculdade_id is None


def test_stamp_rejeita_orfao():
    """Deixar passar criaria uma linha órfã, invisível para todos."""
    with pytest.raises(HTTPException) as exc:
        orfao().stamp(_Linha())
    assert exc.value.status_code == 403


# ── filter_query ─────────────────────────────────────────────────────────────

class _QueryFake:
    """Registra os filtros aplicados, sem tocar no banco."""

    def __init__(self):
        self.filtros = []

    def filter(self, criterio):
        self.filtros.append(criterio)
        return self


def test_super_admin_nao_recebe_filtro():
    q = _QueryFake()
    assert super_admin().filter_query(q, "coluna") is q
    assert q.filtros == []


def test_usuario_do_tenant_recebe_um_filtro():
    q = _QueryFake()
    do_tenant(1).filter_query(q, "coluna")
    assert len(q.filtros) == 1


def test_orfao_recebe_filtro_que_nega_tudo():
    """
    Precisa ser `WHERE false`. Devolver a query sem filtro exporia todos os
    tenants; filtrar por `coluna IS NULL` exporia as linhas órfãs.
    """
    q = _QueryFake()
    orfao().filter_query(q, "coluna")
    assert len(q.filtros) == 1
    assert "false" in str(q.filtros[0]).lower()
