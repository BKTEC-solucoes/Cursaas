"""
Cria o PRIMEIRO super admin de uma instalacao.

Existe porque a instalacao nasce sem nenhuma forma de entrar: o auto-cadastro
publico (`POST /api/cadastro`) so registra uma *solicitacao*, e aprova-la exige
um super admin — que ainda nao existe. Sem este script o sistema recem-instalado
fica inacessivel.

Nao confundir com `seed_ambiente_teste.py`, que DROPA o banco e semeia dados
ficticios. Este aqui nao apaga nada e recusa rodar se ja houver super admin.

Uso, com o stack no ar:

    docker compose exec backend python criar_super_admin.py

A senha e pedida de forma interativa e nunca aparece em argumento de linha de
comando — argumentos vazam no histórico do shell e em `ps`.
"""

import getpass
import re
import sys

from app.database import SessionLocal
from app.models import Usuario, RoleEnum, AdminRoleEnum
from app.services.auth_service import AuthService

# Espelha o minimo aplicado no resto do sistema. Nao e uma politica sofisticada:
# so evita que a conta mais privilegiada da instalacao nasca com "123456".
TAMANHO_MINIMO_SENHA = 12


def _perguntar(rotulo: str) -> str:
    valor = input(f"{rotulo}: ").strip()
    if not valor:
        print("Valor obrigatorio.", file=sys.stderr)
        sys.exit(1)
    return valor


def main() -> int:
    db = SessionLocal()
    try:
        # faculdade_id fica NULL de proposito: super admin nao pertence a tenant
        # nenhum. Ver a tabela de tres estados no CLAUDE.md — NULL aqui so
        # significa "sem tenant"; quem concede a visao global e o admin_role.
        ja_existe = (
            db.query(Usuario)
            .filter(Usuario.admin_role == AdminRoleEnum.super_admin)
            .first()
        )
        if ja_existe:
            print(
                f"Ja existe um super admin ({ja_existe.email}). "
                "Este script so cria o primeiro; use a interface de convites "
                "para adicionar outros.",
                file=sys.stderr,
            )
            return 1

        nome = _perguntar("Nome completo")
        email = _perguntar("E-mail").lower()

        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            print("E-mail invalido.", file=sys.stderr)
            return 1

        if db.query(Usuario).filter(Usuario.email == email).first():
            print(f"Ja existe usuario com o e-mail {email}.", file=sys.stderr)
            return 1

        senha = getpass.getpass("Senha: ")
        if len(senha) < TAMANHO_MINIMO_SENHA:
            print(
                f"Senha muito curta (minimo {TAMANHO_MINIMO_SENHA} caracteres).",
                file=sys.stderr,
            )
            return 1
        if senha != getpass.getpass("Confirme a senha: "):
            print("As senhas nao conferem.", file=sys.stderr)
            return 1

        usuario = Usuario(
            nome=nome,
            email=email,
            senha=AuthService.hash_password(senha),
            role=RoleEnum.admin,
            admin_role=AdminRoleEnum.super_admin,
            faculdade_id=None,
            ativo=True,
        )
        db.add(usuario)
        db.commit()

        print(f"\nSuper admin criado: {email}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
