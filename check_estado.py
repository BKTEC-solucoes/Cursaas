"""Verifica o estado do DB para faculdade 6."""
from sqlalchemy import create_engine, text
e = create_engine("mysql+pymysql://root:gahesil@localhost:3306/cursaas")
with e.connect() as conn:
    # Usuário com faculdade_id=6
    r = conn.execute(text(
        "SELECT id, email, role, admin_role, faculdade_id FROM usuarios "
        "WHERE faculdade_id = 6"
    ))
    print("Usuarios com faculdade_id=6:")
    for row in r:
        print(f"  {dict(row._mapping)}")

    # Tema para faculdade 6
    r2 = conn.execute(text(
        "SELECT id, nome, faculdade_id FROM faculdade_temas WHERE faculdade_id = 6"
    ))
    print("\nTemas para faculdade_id=6:")
    rows = list(r2)
    if rows:
        for row in rows:
            print(f"  {dict(row._mapping)}")
    else:
        print("  Nenhum tema encontrado")

    # Colunas atuais da tabela
    r3 = conn.execute(text(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA='cursaas' AND TABLE_NAME='faculdade_temas' "
        "ORDER BY ORDINAL_POSITION"
    ))
    cols = [row[0] for row in r3]
    print(f"\nColunas em faculdade_temas ({len(cols)} total):")
    print(" ", ", ".join(cols))
