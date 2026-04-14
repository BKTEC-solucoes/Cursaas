"""
Multi-tenant security para FastAPI.

Fornece ``TenantContext``, uma dependency injetável que:
  - Carrega o ``faculdade_id`` do JWT do usuário autenticado.
  - Expõe ``filter_query()`` para aplicar WHERE à queries SQLAlchemy.
  - Expõe ``assert_access()`` para bloquear acesso cruzado entre tenants.

Super admins (``faculdade_id = None``) ignoram todos os filtros.

Exemplos de uso
---------------

**Listagem — filtrar query pelo tenant:**

    from app.security.tenant import TenantContext, tenant_context

    @router.get("/")
    def list_cursos(
        db: Session = Depends(get_db),
        tc: TenantContext = Depends(tenant_context),
    ):
        query = db.query(Curso).filter(Curso.ativo == True)
        query = tc.filter_query(query, Curso.faculdade_id)
        return query.all()

**Recurso único — bloquear acesso cruzado:**

    @router.get("/{id}")
    def get_prova(
        id: int,
        db: Session = Depends(get_db),
        tc: TenantContext = Depends(tenant_context),
    ):
        prova = db.query(Prova).filter(Prova.id == id).first()
        if not prova:
            raise HTTPException(404)
        tc.assert_access(prova.faculdade_id)   # 403 se tenant diferente
        return prova

**Join transitivo — recurso sem faculdade_id direto (ex: Aula via Curso):**

    @router.get("/")
    def list_aulas(
        db: Session = Depends(get_db),
        tc: TenantContext = Depends(tenant_context),
    ):
        query = (
            db.query(Aula)
            .join(Curso, Aula.curso_id == Curso.id)
            .filter(Aula.ativo == True)
        )
        query = tc.filter_query(query, Curso.faculdade_id)
        return query.all()
"""
from typing import Optional

from fastapi import Depends, HTTPException, status

from app.routes.auth import get_current_faculdade_id


class TenantContext:
    """
    Encapsula a identidade de tenant do chamador para uma única requisição HTTP.

    Inject via::

        tc: TenantContext = Depends(tenant_context)
    """

    def __init__(self, faculdade_id: Optional[int]) -> None:
        self.faculdade_id = faculdade_id
        self.is_super_admin: bool = faculdade_id is None

    # ------------------------------------------------------------------
    # Filtro em queries (endpoints de listagem)
    # ------------------------------------------------------------------

    def filter_query(self, query, column):
        """
        Aplica ``WHERE <column> = faculdade_id`` à query SQLAlchemy.
        Super admins recebem a query sem filtro.

        Exemplo::

            query = tc.filter_query(db.query(Curso), Curso.faculdade_id)
        """
        if self.is_super_admin:
            return query
        return query.filter(column == self.faculdade_id)

    # ------------------------------------------------------------------
    # Verificação em nível de linha (endpoints de recurso único)
    # ------------------------------------------------------------------

    def assert_access(self, resource_faculdade_id: Optional[int]) -> None:
        """
        Lança HTTP 403 se o tenant do chamador difere do tenant do recurso.
        Super admins sempre passam.

        Exemplo::

            tc.assert_access(prova.faculdade_id)
        """
        if self.is_super_admin:
            return
        if resource_faculdade_id != self.faculdade_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: recurso pertence a outro tenant",
            )

    # ------------------------------------------------------------------
    # Helpers para criação de recursos
    # ------------------------------------------------------------------

    def require_tenant(self) -> int:
        """
        Garante que o chamador está vinculado a um tenant.
        Lança HTTP 403 se ``faculdade_id`` for None (super_admin sem contexto).

        Exemplo::

            fid = tc.require_tenant()   # retorna int ou levanta 403
        """
        if self.faculdade_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta operação requer vínculo com uma faculdade",
            )
        return self.faculdade_id

    def stamp(self, obj: object, field: str = "faculdade_id") -> object:
        """
        Atribui ``obj.<field> = self.faculdade_id`` em novos objetos antes de
        persistir no banco. Super admins não recebem o stamp (já devem definir
        o campo manualmente).

        Exemplo::

            novo_curso = Curso(**dados)
            tc.stamp(novo_curso)        # define novo_curso.faculdade_id
            db.add(novo_curso)
        """
        if not self.is_super_admin:
            setattr(obj, field, self.faculdade_id)
        return obj


def tenant_context(
    faculdade_id: Optional[int] = Depends(get_current_faculdade_id),
) -> TenantContext:
    """
    FastAPI dependency.  Produz um :class:`TenantContext` com escopo na
    requisição atual.
    """
    return TenantContext(faculdade_id)
