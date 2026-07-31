"""
Assinatura das URLs de reprodução de vídeo.

Existe para separar **autorização** de **entrega**. Antes as duas coisas eram a
mesma requisição: o front baixava o arquivo inteiro por XHR só para poder mandar
o `Authorization: Bearer`, e reproduzia de uma object URL — sem seek, sem range,
com o blob todo em memória e com os bytes saindo pelo processo Python.

Agora a rota autenticada devolve uma URL assinada de curta duração, e o
`<video src>` busca essa URL direto. A assinatura é o que autoriza a entrega,
porque a tag de mídia não envia cabeçalho algum.

Limite conhecido: a assinatura cobre arquivo + expiração, não usuário nem
tenant. Quem receber o link reproduz o vídeo até ele expirar. Amarrar ao usuário
não é possível sem cabeçalho, e amarrar ao IP quebra em rede móvel — o controle
real é o TTL (`VIDEO_URL_TTL_SECONDS`), somado ao fato de que só quem já passou
pelo `TenantContext` consegue gerar um link.
"""
import hashlib
import hmac
import time
from urllib.parse import quote

from app.config import settings


def _mensagem(filename: str, exp: int) -> bytes:
    return f"{filename}:{exp}".encode("utf-8")


def _assinatura(filename: str, exp: int) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        _mensagem(filename, exp),
        hashlib.sha256,
    ).hexdigest()


def assinar_url_video(filename: str, ttl: int | None = None) -> str:
    """
    Devolve o caminho assinado de reprodução, **relativo à base da API**.

    O front concatena com `environment.apiUrl` — que é absoluto no `ng serve`
    (`http://localhost:8000/api`) e relativo em produção (`/api`). Assim o
    backend não precisa conhecer o hostname público, que atrás do nginx ele não
    tem como descobrir de forma confiável.
    """
    exp = int(time.time()) + (ttl if ttl is not None else settings.VIDEO_URL_TTL_SECONDS)
    sig = _assinatura(filename, exp)
    return f"/aulas/video/{quote(filename)}?exp={exp}&sig={sig}"


def verificar_assinatura(filename: str, exp: int, sig: str) -> bool:
    """
    Valida expiração e assinatura.

    A expiração é checada antes por ser mais barata, e a comparação usa
    `compare_digest` para não vazar o prefixo correto pelo tempo de resposta.
    """
    if exp < int(time.time()):
        return False
    return hmac.compare_digest(_assinatura(filename, exp), sig)
