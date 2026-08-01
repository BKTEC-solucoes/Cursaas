"""
Escopo do convite de admin — quem nasce dentro de uma instituição e quem não.

O front manda ``X-Faculdade-Id`` em toda chamada a `/api`, inclusive quando o
super admin convida outro super admin pelo painel de Sistema. Sem a regra
testada aqui o convidado nasceria preso à faculdade que estava aberta na tela.

Sem banco: os caminhos cobertos decidem antes de qualquer query.
"""
import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.models import AdminRoleEnum as ModelAdminRoleEnum
from app.routes.convites import _resolver_faculdade_do_convite
from app.schemas import AdminRoleEnum, ConviteAdminCreate


def _request(escopo: str | None = None):
    headers = {"X-Faculdade-Id": escopo} if escopo is not None else {}
    return SimpleNamespace(headers=headers)


def _usuario(admin_role, faculdade_id):
    return SimpleNamespace(admin_role=admin_role, faculdade_id=faculdade_id)


class _DbFake:
    """Responde à checagem `Faculdade ativa?` sem banco. `db=None` nos casos
    que decidem antes de chegar lá."""

    def __init__(self, faculdade_existe: bool = True):
        self._existe = faculdade_existe

    def query(self, *_):
        return self

    def filter(self, *_):
        return self

    def first(self):
        return (1,) if self._existe else None


def test_super_admin_nasce_global_mesmo_com_escopo_no_cabecalho():
    dados = ConviteAdminCreate(email="novo@exemplo.com", admin_role=AdminRoleEnum.super_admin)

    faculdade = _resolver_faculdade_do_convite(
        request=_request("7"),
        dados=dados,
        current_user=_usuario(ModelAdminRoleEnum.super_admin, 7),
        db=None,
    )

    assert faculdade is None


def test_instrutor_sem_nenhuma_faculdade_e_recusado():
    """Conta órfã loga e não enxerga nada — melhor barrar no convite."""
    dados = ConviteAdminCreate(email="novo@exemplo.com", admin_role=AdminRoleEnum.instrutor)

    with pytest.raises(HTTPException) as exc:
        _resolver_faculdade_do_convite(
            request=_request(),
            dados=dados,
            current_user=_usuario(ModelAdminRoleEnum.super_admin, None),
            db=None,
        )

    assert exc.value.status_code == 400


def test_admin_da_faculdade_convida_sempre_dentro_do_proprio_vinculo():
    """Cabeçalho de escopo vem do cliente e não pode mover o convite de tenant."""
    dados = ConviteAdminCreate(email="novo@exemplo.com", admin_role=AdminRoleEnum.instrutor)

    faculdade = _resolver_faculdade_do_convite(
        request=_request("99"),
        dados=dados,
        current_user=_usuario(ModelAdminRoleEnum.admin_faculdade, 7),
        db=_DbFake(),
    )

    assert faculdade == 7


def test_admin_da_faculdade_nao_convida_para_outra_faculdade():
    dados = ConviteAdminCreate(
        email="novo@exemplo.com",
        admin_role=AdminRoleEnum.admin_faculdade,
        faculdade_id=99,
    )

    with pytest.raises(HTTPException) as exc:
        _resolver_faculdade_do_convite(
            request=_request(),
            dados=dados,
            current_user=_usuario(ModelAdminRoleEnum.admin_faculdade, 7),
            db=None,
        )

    assert exc.value.status_code == 403


def test_admin_da_faculdade_sem_vinculo_e_recusado():
    dados = ConviteAdminCreate(email="novo@exemplo.com", admin_role=AdminRoleEnum.instrutor)

    with pytest.raises(HTTPException) as exc:
        _resolver_faculdade_do_convite(
            request=_request("7"),
            dados=dados,
            current_user=_usuario(ModelAdminRoleEnum.admin_faculdade, None),
            db=None,
        )

    assert exc.value.status_code == 403
