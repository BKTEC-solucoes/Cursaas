"""
TenantContext — o invariante central do multi-tenant.

Estes testes cobrem os QUATRO estados possíveis. O bug historico tratava
"sem tenant" como "super admin", entregando todos os tenants a qualquer conta
órfã (admin criado por convite, aluno não aprovado, conta legada).

O quarto estado é o super admin com escopo: o painel administrativo gerenciando
uma instituição por vez (cabeçalho ``X-Faculdade-Id``).

Sem banco: TenantContext é lógica pura sobre um faculdade_id e uma flag.
"""
import pytest
from fastapi import HTTPException

from app.security.tenant import TenantContext, ler_escopo_faculdade


# ── Fábricas dos quatro estados ─────────────────────────────────────────────

def super_admin() -> TenantContext:
    return TenantContext(faculdade_id=None, is_super_admin=True)


def super_admin_com_escopo(fid: int = 1) -> TenantContext:
    """Super admin gerenciando UMA faculdade — via cabeçalho X-Faculdade-Id."""
    return TenantContext(faculdade_id=fid, is_super_admin=True, escopo_explicito=True)


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


# ── Super admin com escopo (painel gerenciando uma instituição) ──────────────

def test_escopo_filtra_como_admin_do_tenant():
    """Sem isso o painel mostrava cursos/aulas de todos os tenants misturados."""
    q = _QueryFake()
    super_admin_com_escopo(5).filter_query(q, "coluna")
    assert len(q.filtros) == 1


def test_escopo_acessa_a_faculdade_escolhida():
    super_admin_com_escopo(5).assert_access(5)


@pytest.mark.parametrize("recurso", [6, None])
def test_escopo_bloqueia_fora_da_faculdade_escolhida(recurso):
    """Trocar de faculdade é trocar o escopo, não furar o filtro."""
    with pytest.raises(HTTPException) as exc:
        super_admin_com_escopo(5).assert_access(recurso)
    assert exc.value.status_code == 403


def test_escopo_carimba_novos_registros():
    """É o que permite ao super admin criar curso/aluno sem informar o tenant."""
    obj = _Linha()
    super_admin_com_escopo(5).stamp(obj)
    assert obj.faculdade_id == 5


def test_escopo_satisfaz_require_tenant():
    assert super_admin_com_escopo(5).require_tenant() == 5


# ── Leitura do cabeçalho de escopo ──────────────────────────────────────────

class _RequestFake:
    def __init__(self, valor=None):
        self.headers = {} if valor is None else {"X-Faculdade-Id": valor}


@pytest.mark.parametrize("valor", [None, "", "   ", "todas", "all", "null"])
def test_escopo_ausente_ou_neutro_vira_none(valor):
    assert ler_escopo_faculdade(_RequestFake(valor)) is None


def test_escopo_numerico_e_lido():
    assert ler_escopo_faculdade(_RequestFake("42")) == 42


def test_escopo_invalido_e_erro_do_cliente():
    with pytest.raises(HTTPException) as exc:
        ler_escopo_faculdade(_RequestFake("abc"))
    assert exc.value.status_code == 400
