# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Migração segura: adiciona suporte multi-tenant (faculdades) ao banco existente.

Executar:
    cd backend
    python migrate_add_faculdades.py
"""
import sys
from sqlalchemy import inspect, text
from app.database import engine, Base
from app.models import Faculdade, VinculoAlunoFaculdade  # noqa: F401 – registra os models

def column_exists(inspector, table: str, column: str) -> bool:
    return any(c["name"] == column for c in inspector.get_columns(table))

def table_exists(inspector, table: str) -> bool:
    return table in inspector.get_table_names()


def run():
    inspector = inspect(engine)

    print("=== Migração Multi-Tenant: Faculdades ===\n")

    with engine.begin() as conn:

        # 1. Criar tabela faculdades
        if not table_exists(inspector, "faculdades"):
            print("[1/5] Criando tabela 'faculdades'...")
            Base.metadata.tables["faculdades"].create(bind=engine)
            print("      OK")
        else:
            print("[1/5] Tabela 'faculdades' já existe — pulando.")

        # 2. Inserir faculdade padrão se a tabela estiver vazia
        result = conn.execute(text("SELECT COUNT(*) FROM faculdades")).scalar()
        if result == 0:
            print("[2/5] Inserindo 'Faculdade Padrão'...")
            conn.execute(text(
                "INSERT INTO faculdades (nome, slug, ativa, aprovada, plano, data_criacao, data_atualizacao) "
                "VALUES ('Faculdade Padrão', 'padrao', 1, 1, 'basico', NOW(), NOW())"
            ))
            print("      OK")
        else:
            print("[2/5] Faculdade padrão já existe — pulando inserção.")

        faculdade_padrao_id = conn.execute(
            text("SELECT id FROM faculdades WHERE slug = 'padrao' LIMIT 1")
        ).scalar()
        print(f"      faculdade_padrao_id = {faculdade_padrao_id}")

        # 3. Coluna faculdade_id em usuarios
        if not column_exists(inspector, "usuarios", "faculdade_id"):
            print("[3/5] Adicionando 'faculdade_id' em 'usuarios'...")
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN faculdade_id INT NULL AFTER instituicao_id"))
            conn.execute(text(f"UPDATE usuarios SET faculdade_id = {faculdade_padrao_id}"))
            conn.execute(text(
                "ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_faculdade "
                "FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE"
            ))
            conn.execute(text("ALTER TABLE usuarios ADD INDEX idx_usuarios_faculdade_id (faculdade_id)"))
            conn.execute(text("ALTER TABLE usuarios ADD INDEX idx_usuarios_faculdade_role (faculdade_id, role)"))
            print("      OK")
        else:
            print("[3/5] Coluna 'faculdade_id' em 'usuarios' já existe — pulando.")

        # 4. Coluna faculdade_id em cursos
        if not column_exists(inspector, "cursos", "faculdade_id"):
            print("[4/5] Adicionando 'faculdade_id' em 'cursos'...")
            conn.execute(text("ALTER TABLE cursos ADD COLUMN faculdade_id INT NULL AFTER id"))
            conn.execute(text(f"UPDATE cursos SET faculdade_id = {faculdade_padrao_id}"))
            conn.execute(text(
                "ALTER TABLE cursos ADD CONSTRAINT fk_cursos_faculdade "
                "FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE"
            ))
            conn.execute(text("ALTER TABLE cursos ADD INDEX idx_cursos_faculdade_id (faculdade_id)"))
            conn.execute(text("ALTER TABLE cursos ADD INDEX idx_cursos_faculdade_ativo (faculdade_id, ativo)"))
            print("      OK")
        else:
            print("[4/5] Coluna 'faculdade_id' em 'cursos' já existe — pulando.")

        # 5. Coluna faculdade_id em provas
        if not column_exists(inspector, "provas", "faculdade_id"):
            print("[5/6] Adicionando 'faculdade_id' em 'provas'...")
            conn.execute(text("ALTER TABLE provas ADD COLUMN faculdade_id INT NULL AFTER id"))
            # Herdar faculdade do curso pai
            conn.execute(text(
                "UPDATE provas p "
                "JOIN cursos c ON p.curso_id = c.id "
                "SET p.faculdade_id = c.faculdade_id"
            ))
            conn.execute(text(
                "ALTER TABLE provas ADD CONSTRAINT fk_provas_faculdade "
                "FOREIGN KEY (faculdade_id) REFERENCES faculdades(id) ON DELETE RESTRICT ON UPDATE CASCADE"
            ))
            conn.execute(text("ALTER TABLE provas ADD INDEX idx_provas_faculdade_id (faculdade_id)"))
            print("      OK")
        else:
            print("[5/6] Coluna 'faculdade_id' em 'provas' já existe — pulando.")

        # 6. Criar tabela vinculos_aluno_faculdade e popular
        if not table_exists(inspector, "vinculos_aluno_faculdade"):
            print("[5/5] Criando tabela 'vinculos_aluno_faculdade' e populando com alunos existentes...")
            Base.metadata.tables["vinculos_aluno_faculdade"].create(bind=engine)
            conn.execute(text(
                "INSERT IGNORE INTO vinculos_aluno_faculdade (usuario_id, faculdade_id, status) "
                "SELECT id, faculdade_id, 'ativo' FROM usuarios "
                "WHERE role = 'aluno' AND faculdade_id IS NOT NULL"
            ))
            rows = conn.execute(text("SELECT ROW_COUNT()")).scalar()
            print(f"      OK — {rows} vínculo(s) criado(s)")
        else:
            print("[6/6] Tabela 'vinculos_aluno_faculdade' já existe — pulando.")

    print("\n=== Migração concluída com sucesso! ===")

    # Verificação
    with engine.connect() as conn:
        print("\n--- Verificação ---")
        print(f"  faculdades:                  {conn.execute(text('SELECT COUNT(*) FROM faculdades')).scalar()}")
        print(f"  usuarios com faculdade_id:   {conn.execute(text('SELECT COUNT(*) FROM usuarios WHERE faculdade_id IS NOT NULL')).scalar()}")
        print(f"  cursos com faculdade_id:     {conn.execute(text('SELECT COUNT(*) FROM cursos WHERE faculdade_id IS NOT NULL')).scalar()}")
        print(f"  provas com faculdade_id:     {conn.execute(text('SELECT COUNT(*) FROM provas WHERE faculdade_id IS NOT NULL')).scalar()}")


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\nERRO: {e}", file=sys.stderr)
        sys.exit(1)
