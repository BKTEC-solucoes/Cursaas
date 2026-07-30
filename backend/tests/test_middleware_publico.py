"""
Allowlist de rotas públicas do TenantMiddleware.

`_PUBLIC_PREFIXES` casa por `startswith`, o que é permissivo por natureza:
uma rota nova cujo caminho comece com um prefixo público entra na allowlist sem
ninguém perceber. Estes testes fixam o comportamento esperado.
"""
import pytest

from app.security.middleware import TenantMiddleware

publico = TenantMiddleware._is_public


@pytest.mark.parametrize("caminho", [
    "/health",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/api/faculdades/presets",
    "/api/faculdades/publicas",
    "/api/auth/login",
    "/api/auth/registro",
    "/api/cadastro",
    "/api/cursos/catalogo",
    "/api/faculdades/publica/tema/minha-faculdade",
    "/uploads/profile_pictures/avatar.png",
])
def test_rotas_publicas(caminho):
    assert publico(caminho)


@pytest.mark.parametrize("caminho", [
    "/api/cursos/",
    "/api/cursos/1",
    "/api/alunos/",
    "/api/admin/cursos",
    "/api/auth/admins",
    "/api/aulas/video/aula_1.mp4",   # exige auth desde a correção
    "/api/notas/",
    "/api/provas/",
])
def test_rotas_protegidas(caminho):
    assert not publico(caminho)


def test_health_casa_por_igualdade_e_nao_por_prefixo():
    """
    /health está em _PUBLIC_EXACT. Se migrasse para os prefixos, um endpoint
    tipo /health-interno herdaria acesso público.
    """
    assert publico("/health")
    assert not publico("/health-interno")
    assert not publico("/healthz")
