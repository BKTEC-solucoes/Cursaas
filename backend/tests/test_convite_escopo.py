"""
Escopo do convite de admin — quem nasce dentro de uma instituição e quem não.

O front manda ``X-Faculdade-Id`` em toda chamada a `/api`, inclusive quando o
super admin convida outro super admin pelo painel de Sistema. Sem a regra
testada aqui o convidado nasceria preso à faculdade que estava aberta na tela.

Sem banco: os dois caminhos cobertos decidem antes de qualquer query.
"""
import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from app.routes.convites import _resolver_faculdade_do_convite
from app.schemas import AdminRoleEnum, ConviteAdminCreate


def _request(escopo: str | None = None):
    headers = {"X-Faculdade-Id": escopo} if escopo is not None else {}
    return SimpleNamespace(headers=headers)


def test_super_admin_nasce_global_mesmo_com_escopo_no_cabecalho():
    dados = ConviteAdminCreate(email="novo@exemplo.com", admin_role=AdminRoleEnum.super_admin)

    faculdade = _resolver_faculdade_do_convite(
        request=_request("7"),
        dados=dados,
        current_user=SimpleNamespace(faculdade_id=7),
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
            current_user=SimpleNamespace(faculdade_id=None),
            db=None,
        )

    assert exc.value.status_code == 400
