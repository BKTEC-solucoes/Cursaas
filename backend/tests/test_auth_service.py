"""AuthService — hash de senha e ciclo de vida do JWT. Sem banco."""
from datetime import timedelta

import pytest

from app.services.auth_service import AuthService


# ── Senhas ───────────────────────────────────────────────────────────────────

def test_hash_nao_guarda_a_senha_em_claro():
    h = AuthService.hash_password("Teste@123")
    assert "Teste@123" not in h
    assert h.startswith("$2")  # bcrypt


def test_verify_aceita_a_senha_correta():
    assert AuthService.verify_password("Teste@123", AuthService.hash_password("Teste@123"))


def test_verify_rejeita_senha_errada():
    assert not AuthService.verify_password("errada", AuthService.hash_password("Teste@123"))


def test_hashes_do_mesmo_texto_sao_diferentes():
    """Salt por hash: dois hashes iguais denunciariam ausência de salt."""
    assert AuthService.hash_password("igual") != AuthService.hash_password("igual")


# ── JWT ──────────────────────────────────────────────────────────────────────

CLAIMS = {
    "sub": "alguem@cursaas.dev",
    "role": "admin",
    "admin_role": "instrutor",
    "user_id": 42,
    "nome": "Alguem",
    "faculdade_id": 7,
}


def test_token_faz_round_trip():
    payload = AuthService.decode_token(AuthService.create_access_token(CLAIMS))
    assert payload["email"] == "alguem@cursaas.dev"
    assert payload["user_id"] == 42
    assert payload["faculdade_id"] == 7
    assert payload["admin_role"] == "instrutor"


def test_decode_rejeita_token_expirado():
    token = AuthService.create_access_token(CLAIMS, expires_delta=timedelta(seconds=-1))
    assert AuthService.decode_token(token) is None


def test_decode_rejeita_assinatura_adulterada():
    token = AuthService.create_access_token(CLAIMS)
    corpo, _, _assinatura = token.rpartition(".")
    assert AuthService.decode_token(corpo + ".assinaturafalsa") is None


def test_decode_rejeita_lixo():
    for entrada in ("", "abc", "a.b.c"):
        assert AuthService.decode_token(entrada) is None


def test_faculdade_id_nulo_sobrevive_ao_round_trip():
    """
    Super admin viaja com faculdade_id=None. Se a claim sumisse no encode, o
    TenantContext não teria como distinguir super admin de conta órfã.
    """
    claims = {**CLAIMS, "faculdade_id": None, "admin_role": "super_admin"}
    payload = AuthService.decode_token(AuthService.create_access_token(claims))
    assert payload["faculdade_id"] is None
    assert payload["admin_role"] == "super_admin"
