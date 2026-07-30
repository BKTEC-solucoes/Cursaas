"""
Recria o banco do ZERO e semeia usuários de teste para cada área do app.

⚠️  DESTRUTIVO — dropa TODAS as tabelas do schema apontado por DATABASE_URL.
    Use só em ambiente de desenvolvimento.

Uso:
    python seed_ambiente_teste.py --confirmar --banco cursaas

O nome passado em --banco precisa bater com o banco do DATABASE_URL. É uma trava
para não apontar sem querer para produção.

O que é criado
--------------
Duas faculdades (tenants) para que o isolamento multi-tenant seja testável de
verdade — com um tenant só, um vazamento entre tenants não aparece.

    Faculdade Alfa (slug: alfa)   ·   Faculdade Beta (slug: beta)

Usuários (senha de todos: Teste@123):

    super@cursaas.dev              admin / super_admin      sem tenant (vê tudo)
    instrutor.alfa@cursaas.dev     admin / instrutor        Alfa
    instrutor.beta@cursaas.dev     admin / instrutor        Beta
    instituicao.alfa@cursaas.dev   instituicao              Alfa
    instituicao.beta@cursaas.dev   instituicao              Beta
    aluno.alfa@cursaas.dev         aluno (vínculo ativo)    Alfa
    aluno.beta@cursaas.dev         aluno (vínculo ativo)    Beta
    aluno.pendente@cursaas.dev     aluno (SEM vínculo)      Alfa

`aluno.pendente` existe de propósito: cobre o estado "cadastrado mas não
aprovado", que é o caso em que o bug de `faculdade_id is None` virava super
admin. Ele deve enxergar zero cursos.
"""
import argparse
import sys
from datetime import datetime, timedelta

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import (
    Aula,
    Curso,
    Faculdade,
    FaculdadeTema,
    RoleEnum,
    AdminRoleEnum,
    StatusCursoEnum,
    Usuario,
    VinculoAlunoFaculdade,
    VinculoStatusEnum,
)
from app.services.auth_service import AuthService

SENHA_PADRAO = "Teste@123"


def _confirmar_alvo(banco_informado: str) -> None:
    """Aborta se o banco do DATABASE_URL não for o que o operador digitou."""
    banco_real = engine.url.database
    if banco_informado != banco_real:
        sys.exit(
            f"ABORTADO: --banco='{banco_informado}' não bate com o banco do "
            f"DATABASE_URL ('{banco_real}'). Nada foi alterado."
        )


def _recriar_schema() -> None:
    """
    DROP DATABASE + CREATE DATABASE — e não `Base.metadata.drop_all()`.

    O drop_all só derruba as tabelas mapeadas pelos modelos. O banco de
    desenvolvimento tinha, além do Cursaas, o Sakila inteiro e 98 views do
    schema `sys` (restauração de um dump completo por cima do banco). Só o DROP
    do schema devolve um banco realmente limpo.
    """
    banco = engine.url.database

    # Precisa de uma conexão FORA do banco que será dropado.
    servidor = create_engine(engine.url.set(database=None), isolation_level="AUTOCOMMIT")
    try:
        with servidor.connect() as conn:
            print(f"Dropando o banco '{banco}' por completo...")
            conn.execute(text(f"DROP DATABASE IF EXISTS `{banco}`"))
            print(f"Recriando '{banco}' (utf8mb4 / utf8mb4_0900_ai_ci)...")
            conn.execute(
                text(
                    f"CREATE DATABASE `{banco}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
                )
            )
    finally:
        servidor.dispose()

    # O pool do engine principal aponta para conexões de um banco que não existe
    # mais; descarta antes de recriar as tabelas.
    engine.dispose()
    print("Criando as tabelas a partir dos modelos...")
    Base.metadata.create_all(bind=engine)


def _criar_faculdade(
    db: Session, nome: str, slug: str, primary: str, dark_primary: str
) -> Faculdade:
    faculdade = Faculdade(
        nome=nome,
        slug=slug,
        email_contato=f"contato@{slug}.cursaas.dev",
        ativa=True,
        aprovada=True,
    )
    db.add(faculdade)
    db.flush()

    # Cor clara E escura por tenant: sem diferenciar a escura, os dois
    # marketplaces ficam idênticos em quem usa o SO em dark mode, e o
    # white-label deixa de ser testável visualmente.
    tema = FaculdadeTema(
        faculdade_id=faculdade.id,
        nome=f"Tema {nome}",
        primary_color=primary,
        dark_primary_color=dark_primary,
    )
    db.add(tema)
    db.flush()

    faculdade.tema_ativo_id = tema.id
    return faculdade


def _criar_usuario(
    db: Session,
    email: str,
    nome: str,
    role: RoleEnum,
    admin_role: AdminRoleEnum | None = None,
    faculdade_id: int | None = None,
) -> Usuario:
    usuario = Usuario(
        nome=nome,
        email=email,
        senha=AuthService.hash_password(SENHA_PADRAO),
        role=role,
        admin_role=admin_role,
        faculdade_id=faculdade_id,
        ativo=True,
    )
    db.add(usuario)
    db.flush()
    return usuario


def _vincular(db: Session, usuario: Usuario, faculdade: Faculdade, matricula: str) -> None:
    db.add(
        VinculoAlunoFaculdade(
            usuario_id=usuario.id,
            faculdade_id=faculdade.id,
            matricula=matricula,
            status=VinculoStatusEnum.ativo,
        )
    )
    usuario.numero_matricula = matricula


def _criar_curso(db: Session, faculdade: Faculdade, criado_por: Usuario, nome: str) -> Curso:
    curso = Curso(
        faculdade_id=faculdade.id,
        nome=nome,
        descricao=f"Curso de demonstração da {faculdade.nome}",
        pago=False,
        status=StatusCursoEnum.aprovado,
        ativo=True,
        criado_por_id=criado_por.id,
    )
    db.add(curso)
    db.flush()

    db.add(
        Aula(
            curso_id=curso.id,
            titulo=f"Aula inaugural — {nome}",
            descricao="Aula de exemplo criada pelo seed.",
            data_aula=datetime.utcnow() + timedelta(days=1),
            duracao_minutos=50,
            ativo=True,
        )
    )
    return curso


def semear() -> None:
    with Session(engine) as db:
        alfa = _criar_faculdade(db, "Faculdade Alfa", "alfa", "#1a6b3c", "#34d399")
        beta = _criar_faculdade(db, "Faculdade Beta", "beta", "#1d4ed8", "#60a5fa")

        # Super admin: sem tenant PORQUE é super admin — o TenantContext
        # distingue esse caso de "usuário órfão" pelo admin_role.
        _criar_usuario(
            db, "super@cursaas.dev", "Super Admin",
            RoleEnum.admin, AdminRoleEnum.super_admin, faculdade_id=None,
        )

        instrutor_alfa = _criar_usuario(
            db, "instrutor.alfa@cursaas.dev", "Instrutor Alfa",
            RoleEnum.admin, AdminRoleEnum.instrutor, faculdade_id=alfa.id,
        )
        instrutor_beta = _criar_usuario(
            db, "instrutor.beta@cursaas.dev", "Instrutor Beta",
            RoleEnum.admin, AdminRoleEnum.instrutor, faculdade_id=beta.id,
        )

        _criar_usuario(
            db, "instituicao.alfa@cursaas.dev", "Instituição Alfa",
            RoleEnum.instituicao, faculdade_id=alfa.id,
        )
        _criar_usuario(
            db, "instituicao.beta@cursaas.dev", "Instituição Beta",
            RoleEnum.instituicao, faculdade_id=beta.id,
        )

        aluno_alfa = _criar_usuario(
            db, "aluno.alfa@cursaas.dev", "Aluno Alfa",
            RoleEnum.aluno, faculdade_id=alfa.id,
        )
        aluno_beta = _criar_usuario(
            db, "aluno.beta@cursaas.dev", "Aluno Beta",
            RoleEnum.aluno, faculdade_id=beta.id,
        )
        _vincular(db, aluno_alfa, alfa, "FAC1-2026-000001")
        _vincular(db, aluno_beta, beta, "FAC2-2026-000001")

        # Sem vínculo de propósito: deve enxergar zero cursos.
        _criar_usuario(
            db, "aluno.pendente@cursaas.dev", "Aluno Pendente",
            RoleEnum.aluno, faculdade_id=alfa.id,
        )

        _criar_curso(db, alfa, instrutor_alfa, "Introdução à Programação")
        _criar_curso(db, beta, instrutor_beta, "Cálculo I")
        # Mesmo nome nas duas faculdades: valida que a unicidade é por tenant.
        _criar_curso(db, alfa, instrutor_alfa, "Cálculo I")

        db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirmar", action="store_true",
                        help="Obrigatório. Confirma que você quer APAGAR o banco.")
    parser.add_argument("--banco", required=True,
                        help="Nome do banco alvo; precisa bater com o DATABASE_URL.")
    args = parser.parse_args()

    if not args.confirmar:
        sys.exit("ABORTADO: passe --confirmar para apagar e recriar o banco.")

    _confirmar_alvo(args.banco)
    _recriar_schema()
    semear()

    # Só ASCII: o console do Windows usa cp1252 e estoura UnicodeEncodeError em
    # setas e acentos quando a saída não é redirecionada.
    print("\nBanco recriado. Senha de todos os usuarios: " + SENHA_PADRAO)
    print("  super@cursaas.dev            -> /admin       (super admin, ve os 2 tenants)")
    print("  instrutor.alfa@cursaas.dev   -> /admin       (so Alfa)")
    print("  instrutor.beta@cursaas.dev   -> /admin       (so Beta)")
    print("  instituicao.alfa@cursaas.dev -> /instituicao (Alfa)")
    print("  instituicao.beta@cursaas.dev -> /instituicao (Beta)")
    print("  aluno.alfa@cursaas.dev       -> /aluno       (Alfa, vinculo ativo)")
    print("  aluno.beta@cursaas.dev       -> /aluno       (Beta, vinculo ativo)")
    print("  aluno.pendente@cursaas.dev   -> /aluno       (sem vinculo: deve ver 0 cursos)")


if __name__ == "__main__":
    main()
