"""Assinatura das URLs de vídeo — HMAC e expiração. Sem banco, sem servidor."""
import time
from urllib.parse import parse_qs, urlparse

import pytest

from app.services.video_url import assinar_url_video, verificar_assinatura


def _partes(url: str) -> tuple[str, int, str]:
    """Quebra a URL assinada em (filename, exp, sig)."""
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    filename = parsed.path.rsplit("/", 1)[-1]
    return filename, int(query["exp"][0]), query["sig"][0]


# ── Formato ──────────────────────────────────────────────────────────────────

def test_url_e_relativa_a_base_da_api():
    """
    O front concatena com `environment.apiUrl`. Uma URL absoluta aqui quebraria
    em produção, onde o backend não conhece o hostname público.
    """
    url = assinar_url_video("aula_1_video_123.mp4")
    assert url.startswith("/aulas/video/")
    assert "://" not in url


def test_url_carrega_exp_e_sig():
    filename, exp, sig = _partes(assinar_url_video("aula_1_video_123.mp4"))
    assert filename == "aula_1_video_123.mp4"
    assert exp > int(time.time())
    assert len(sig) == 64  # sha256 em hex


# ── Round-trip ───────────────────────────────────────────────────────────────

def test_assinatura_recem_emitida_e_valida():
    filename, exp, sig = _partes(assinar_url_video("aula_1_video_123.mp4"))
    assert verificar_assinatura(filename, exp, sig)


def test_assinatura_nao_vale_para_outro_arquivo():
    """
    O ponto central: sem amarrar o nome do arquivo à assinatura, um link válido
    de um vídeo abriria qualquer outro — inclusive de outro tenant.
    """
    _, exp, sig = _partes(assinar_url_video("aula_1_video_123.mp4"))
    assert not verificar_assinatura("aula_99_video_999.mp4", exp, sig)


def test_esticar_a_expiracao_invalida_a_assinatura():
    """`exp` entra no HMAC, então não dá para prorrogar o link mexendo na query."""
    filename, exp, sig = _partes(assinar_url_video("aula_1_video_123.mp4"))
    assert not verificar_assinatura(filename, exp + 3600, sig)


def test_assinatura_expirada_e_rejeitada():
    """Assinatura íntegra, mas vencida: o TTL é o que limita um link vazado."""
    filename, exp, sig = _partes(assinar_url_video("aula_1_video_123.mp4", ttl=-1))
    assert not verificar_assinatura(filename, exp, sig)


@pytest.mark.parametrize("sig_falsa", ["", "0" * 64, "nao-e-hex"])
def test_assinatura_forjada_e_rejeitada(sig_falsa):
    filename, exp, _ = _partes(assinar_url_video("aula_1_video_123.mp4"))
    assert not verificar_assinatura(filename, exp, sig_falsa)


def test_nome_com_caractere_especial_sobrevive_ao_round_trip():
    """
    O path vai percent-encoded na URL, mas a assinatura é sobre o nome CRU — que
    é o que o FastAPI entrega de volta na rota, já decodificado.
    """
    nome = "aula 1 vídeo & cia.mp4"
    url = assinar_url_video(nome)
    assert " " not in url  # escapado no caminho
    _, exp, sig = _partes(url)
    assert verificar_assinatura(nome, exp, sig)
