"""
Multi-tenant middleware para FastAPI/Starlette.

Responsabilidades
-----------------
1. Extrair e validar o JWT de qualquer requisição autenticada.
2. Injetar ``request.state.faculdade_id`` e ``request.state.user_id``
   antes de chegar em qualquer rota.
3. Rejeitar antecipadamente tokens malformados (antes de bater no banco).
4. Registrar em log aviso quando uma rota protegida não carrega tenant
   (útil para detectar endpoints que esqueceram o TenantContext).

O middleware NÃO bloqueia rotas públicas — isso é responsabilidade das
dependencies de rota (TenantContext, get_current_user, etc.).

Arquitetura em camadas
----------------------
          ┌─────────────────────────────────────────┐
          │  TenantMiddleware (ASGI)                 │
          │  · decodifica JWT sem banco              │
          │  · injeta state.faculdade_id             │
          │  · rejeita tokens inválidos (401)        │
          └───────────────────┬─────────────────────┘
                              │
          ┌───────────────────▼─────────────────────┐
          │  get_current_user (Dependency)           │
          │  · confirma usuário no banco             │
          │  · confirma user.ativo                   │
          │  · confirma user.faculdade_id consistente│
          └───────────────────┬─────────────────────┘
                              │
          ┌───────────────────▼─────────────────────┐
          │  TenantContext (Dependency)              │
          │  · filter_query() em listagens          │
          │  · assert_access() em recursos únicos   │
          └─────────────────────────────────────────┘
"""
from __future__ import annotations

import logging
from typing import Optional

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from app.config import settings

logger = logging.getLogger(__name__)

# Caminhos que nunca carregam JWT — ignorados pelo middleware
# Rotas com correspondência EXATA (sem risco de path bypass por prefixo)
_PUBLIC_EXACT = frozenset({
    "/api/health",
    "/health",
    "/api/faculdades/presets",
    "/api/faculdades/publicas",
    "/docs",
    "/redoc",
    "/openapi.json",
})

# Rotas onde qualquer sub-caminho é público (ex: /uploads/<arquivo>)
_PUBLIC_PREFIXES = (
    "/api/auth/login",
    "/api/auth/registro",
    "/api/cadastro",
    "/api/cursos/catalogo",
    "/api/faculdades/publica/tema",
    "/uploads/",
)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware ASGI de isolamento multi-tenant.

    Injeta no ``request.state``:
      - ``faculdade_id: int | None``  — tenant do chamador (None = super_admin)
      - ``user_id: int | None``       — id do usuário
      - ``tenant_verified: bool``     — True indica que o JWT foi validado aqui

    Uso nas rotas (leitura direta do state, sem tocar no banco):

        @router.get("/")
        def list_items(request: Request):
            fid = request.state.faculdade_id  # já disponível
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Inicializa state com valores neutros
        request.state.faculdade_id  = None
        request.state.user_id       = None
        request.state.tenant_verified = False

        # Rotas públicas passam direto
        if self._is_public(request.url.path):
            return await call_next(request)

        # Sem cabeçalho → rota pode ser pública ou dependency rejeitará depois
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header[7:]  # remove "Bearer "

        payload = self._decode(token)
        if payload is None:
            # Token presente mas inválido → rejeita imediatamente
            return JSONResponse(
                status_code=401,
                content={"detail": "Token inválido ou expirado"},
                headers={"WWW-Authenticate": "Bearer"},
            )

        faculdade_id: Optional[int] = payload.get("faculdade_id")
        user_id: Optional[int]      = payload.get("user_id")

        request.state.faculdade_id   = faculdade_id
        request.state.user_id        = user_id
        request.state.tenant_verified = True

        response = await call_next(request)

        # Auditoria: alerta em log se resposta de sucesso não carregou tenant
        # (ajuda a detectar endpoints sem proteção durante desenvolvimento)
        if (
            response.status_code < 400
            and faculdade_id is None
            and payload.get("admin_role") != "super_admin"
            and not self._is_public(request.url.path)
        ):
            logger.warning(
                "TENANT_AUDIT: resposta %s %s retornou 2xx com faculdade_id=None "
                "para user_id=%s (não é super_admin). "
                "Verifique se o endpoint usa TenantContext.",
                request.method,
                request.url.path,
                user_id,
            )

        return response

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _is_public(path: str) -> bool:
        # Correspondência exata primeiro (mais rápido, sem risco de path bypass)
        if path in _PUBLIC_EXACT:
            return True
        # Prefixos apenas para rotas que genuinamente precisam de sub-caminhos
        return any(path.startswith(prefix) for prefix in _PUBLIC_PREFIXES)

    @staticmethod
    def _decode(token: str) -> Optional[dict]:
        """
        Decodifica o JWT apenas com a chave local — sem consultar o banco.
        Retorna None em caso de qualquer erro de validação.
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            if payload.get("sub") is None:
                return None
            return payload
        except JWTError:
            return None
