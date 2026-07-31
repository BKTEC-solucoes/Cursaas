"""
Multi-tenant security para FastAPI.

Fornece ``TenantContext``, uma dependency injetável que:
  - Carrega o ``faculdade_id`` do JWT do usuário autenticado.
  - Expõe ``filter_query()`` para aplicar WHERE à queries SQLAlchemy.
  - Expõe ``assert_access()`` para bloquear acesso cruzado entre tenants.

Super admins (``faculdade_id = None``) ignoram todos os filtros — a menos que
enviem ``X-Faculdade-Id``, o cabeçalho com que o painel administrativo declara a
instituição que está sendo gerenciada no momento.

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

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import false
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminRoleEnum, Faculdade, Usuario
from app.security.deps import get_current_user

#: Cabeçalho com que o painel do super admin declara a faculdade que está
#: gerenciando no momento. Só é honrado para super admins — ver ``tenant_context``.
ESCOPO_HEADER = "X-Faculdade-Id"


class TenantContext:
    """
    Encapsula a identidade de tenant do chamador para uma única requisição HTTP.

    Inject via::

        tc: TenantContext = Depends(tenant_context)

    Quatro estados possíveis — ``faculdade_id is None`` NÃO implica super admin:

    =========================  ==============  =============  =====================
    Estado                     is_super_admin  faculdade_id   Efeito nos filtros
    =========================  ==============  =============  =====================
    super admin (global)       True            None           sem filtro
    super admin com escopo     True            int            filtra por faculdade_id
    vinculado a tenant         False           int            filtra por faculdade_id
    sem tenant                 False           None           não vê NADA
    =========================  ==============  =============  =====================

    O último estado é real e comum: admin criado por convite, aluno ainda não
    aprovado, conta legada anterior ao multi-tenant. Tratá-lo como super admin
    (bug histórico) entregava todos os tenants a qualquer conta órfã.

    "Super admin com escopo" é o painel administrativo gerenciando UMA faculdade
    de cada vez: o front manda ``X-Faculdade-Id`` e a partir daí toda listagem,
    verificação de acesso e criação de recurso se comporta como se ele fosse
    admin daquele tenant. É conveniência de UI, não fronteira de segurança — o
    escopo vem do cliente e o super admin pode trocá-lo quando quiser.
    """

    def __init__(
        self,
        faculdade_id: Optional[int],
        is_super_admin: bool,
        escopo_explicito: bool = False,
    ) -> None:
        self.faculdade_id = faculdade_id
        self.is_super_admin = is_super_admin
        #: True quando o faculdade_id veio do cabeçalho de escopo, e não do vínculo.
        self.escopo_explicito = escopo_explicito

    # ------------------------------------------------------------------
    # Filtro em queries (endpoints de listagem)
    # ------------------------------------------------------------------

    def filter_query(self, query, column):
        """
        Aplica ``WHERE <column> = faculdade_id`` à query SQLAlchemy.
        Super admin sem escopo recebe a query sem filtro; com escopo ativo,
        filtra pela faculdade escolhida. Quem não tem tenant recebe uma query
        que não retorna linha alguma.

        Exemplo::

            query = tc.filter_query(db.query(Curso), Curso.faculdade_id)
        """
        if self.faculdade_id is not None:
            return query.filter(column == self.faculdade_id)
        if self.is_super_admin:
            return query
        # Sem tenant: nega tudo. Devolver a query sem filtro aqui exporia
        # todos os tenants; devolver `column IS NULL` exporia as linhas órfãs.
        return query.filter(false())

    # ------------------------------------------------------------------
    # Verificação em nível de linha (endpoints de recurso único)
    # ------------------------------------------------------------------

    def assert_access(self, resource_faculdade_id: Optional[int]) -> None:
        """
        Lança HTTP 403 se o tenant do chamador difere do tenant do recurso.
        Super admin sem escopo sempre passa; com escopo ativo só acessa recursos
        da faculdade escolhida (trocar de faculdade é trocar o escopo). Chamador
        sem tenant nunca passa — inclusive para recursos órfãos
        (``faculdade_id IS NULL``), senão ``None == None`` liberaria o acesso.

        Exemplo::

            tc.assert_access(prova.faculdade_id)
        """
        if self.faculdade_id is not None:
            if resource_faculdade_id == self.faculdade_id:
                return
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: recurso pertence a outra faculdade",
            )
        if self.is_super_admin:
            return
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
        persistir no banco. Super admin sem escopo não recebe o stamp — precisa
        informar o tenant explicitamente no payload, já que não tem um próprio.
        Com escopo ativo, o stamp usa a faculdade escolhida no painel.

        Lança 403 para chamador sem tenant: criar a linha com ``faculdade_id
        NULL`` produziria um registro órfão, invisível para todo mundo.

        Exemplo::

            novo_curso = Curso(**dados)
            tc.stamp(novo_curso)        # define novo_curso.faculdade_id
            db.add(novo_curso)
        """
        if self.is_super_admin and self.faculdade_id is None:
            return obj
        setattr(obj, field, self.require_tenant())
        return obj


def ler_escopo_faculdade(request: Request) -> Optional[int]:
    """
    Lê ``X-Faculdade-Id`` do request. Ausente, vazio ou ``"todas"`` significa
    "sem escopo" (None). Valor não numérico é erro do cliente (400).
    """
    bruto = request.headers.get(ESCOPO_HEADER)
    if bruto is None:
        return None

    bruto = bruto.strip()
    if not bruto or bruto.lower() in {"todas", "all", "null"}:
        return None

    try:
        return int(bruto)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cabeçalho {ESCOPO_HEADER} inválido: esperado um id numérico",
        )


def tenant_context(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TenantContext:
    """
    FastAPI dependency.  Produz um :class:`TenantContext` com escopo na
    requisição atual.

    Lê o usuário do banco (e não as claims do JWT) para que uma mudança de papel
    ou de vínculo tenha efeito imediato, sem esperar o token expirar.

    O cabeçalho ``X-Faculdade-Id`` restringe o super admin a uma única faculdade
    — é assim que o painel administrativo "entra" numa instituição. Para os
    demais usuários o cabeçalho não amplia nada: só é aceito se coincidir com o
    vínculo real, caso contrário 403.
    """
    is_super_admin = current_user.admin_role == AdminRoleEnum.super_admin
    escopo = ler_escopo_faculdade(request)

    if escopo is not None:
        if is_super_admin:
            existe = (
                db.query(Faculdade.id)
                .filter(Faculdade.id == escopo, Faculdade.ativa == True)
                .first()
            )
            if not existe:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Faculdade {escopo} não encontrada ou inativa",
                )
            return TenantContext(
                faculdade_id=escopo,
                is_super_admin=True,
                escopo_explicito=True,
            )

        if current_user.faculdade_id != escopo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: você não pertence a esta faculdade",
            )

    return TenantContext(
        faculdade_id=None if is_super_admin else current_user.faculdade_id,
        is_super_admin=is_super_admin,
    )
