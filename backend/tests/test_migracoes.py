"""Parser de scripts SQL do aplicador de migrações. Sem banco, sem servidor."""
from pathlib import Path

from app.migracoes import DIRETORIO_MIGRACOES, dividir_statements, listar_arquivos


# ── Divisão básica ───────────────────────────────────────────────────────────

def test_divide_statements_por_ponto_e_virgula():
    sql = "ALTER TABLE a ADD COLUMN x INT; ALTER TABLE b ADD COLUMN y INT;"
    assert dividir_statements(sql) == [
        "ALTER TABLE a ADD COLUMN x INT",
        "ALTER TABLE b ADD COLUMN y INT",
    ]


def test_ultimo_statement_sem_ponto_e_virgula_final():
    assert dividir_statements("SELECT 1") == ["SELECT 1"]


def test_ignora_statements_vazios():
    """`;;` e o `;` final não podem virar statement vazio — o driver recusaria."""
    assert dividir_statements("SELECT 1;;\n\n;") == ["SELECT 1"]


# ── Comentários ──────────────────────────────────────────────────────────────

def test_comentario_de_linha_nao_vira_statement():
    sql = "-- comenta; com ponto e virgula\nSELECT 1;"
    assert dividir_statements(sql) == ["SELECT 1"]


def test_comentario_de_bloco_e_descartado():
    assert dividir_statements("/* nota; aqui */ SELECT 1;") == ["SELECT 1"]


def test_hash_tambem_comenta():
    assert dividir_statements("# nota; aqui\nSELECT 1;") == ["SELECT 1"]


def test_dois_hifens_grudados_nao_sao_comentario():
    """`a--b` é operador, não comentário: MySQL exige espaço depois de `--`."""
    assert dividir_statements("SELECT 1--2;") == ["SELECT 1--2"]


# ── Strings e identificadores ────────────────────────────────────────────────

def test_ponto_e_virgula_dentro_de_string_nao_divide():
    """
    O caso que quebra o split ingênuo: `migration_tema_urls_text.sql` tem
    COMMENT com ponto e vírgula dentro da string.
    """
    sql = "ALTER TABLE t MODIFY c TEXT COMMENT 'Override de logo; se NULL usa o padrao';"
    assert dividir_statements(sql) == [
        "ALTER TABLE t MODIFY c TEXT COMMENT 'Override de logo; se NULL usa o padrao'"
    ]


def test_aspas_duplas_e_crases_tambem_protegem():
    sql = 'INSERT INTO `tab;ela` VALUES ("a;b");'
    assert dividir_statements(sql) == ['INSERT INTO `tab;ela` VALUES ("a;b")']


def test_aspas_escapadas_com_barra_nao_encerram_a_string():
    sql = "INSERT INTO t VALUES ('o\\'brien; ok');"
    assert dividir_statements(sql) == ["INSERT INTO t VALUES ('o\\'brien; ok')"]


def test_aspas_duplicadas_nao_encerram_a_string():
    sql = "INSERT INTO t VALUES ('aspas '' internas; ok');"
    assert dividir_statements(sql) == ["INSERT INTO t VALUES ('aspas '' internas; ok')"]


def test_traco_traco_dentro_de_string_nao_comenta():
    sql = "INSERT INTO t VALUES ('a -- b; c');"
    assert dividir_statements(sql) == ["INSERT INTO t VALUES ('a -- b; c')"]


# ── DELIMITER ────────────────────────────────────────────────────────────────

def test_delimiter_permite_ponto_e_virgula_no_corpo():
    """Trigger/procedure: o `;` do corpo não pode encerrar o statement."""
    sql = (
        "DELIMITER $$\n"
        "CREATE TRIGGER t BEFORE INSERT ON x FOR EACH ROW BEGIN\n"
        "  SET NEW.a = 1;\n"
        "  SET NEW.b = 2;\n"
        "END$$\n"
        "DELIMITER ;\n"
    )
    statements = dividir_statements(sql)
    assert len(statements) == 1
    assert statements[0].startswith("CREATE TRIGGER")
    assert "SET NEW.b = 2;" in statements[0]


# ── Descoberta de arquivos ───────────────────────────────────────────────────

def test_arquivos_sao_listados_em_ordem_alfabetica(tmp_path: Path):
    """A ordem alfabética do nome É a ordem de aplicação — o prefixo de data."""
    for nome in ("20260301_0900_c.sql", "20260101_0900_a.sql", "20260201_0900_b.sql"):
        (tmp_path / nome).write_text("SELECT 1;", encoding="utf-8")
    assert [m.nome for m in listar_arquivos(tmp_path)] == [
        "20260101_0900_a.sql",
        "20260201_0900_b.sql",
        "20260301_0900_c.sql",
    ]


def test_diretorio_inexistente_nao_quebra(tmp_path: Path):
    assert listar_arquivos(tmp_path / "nao-existe") == []


def test_migracoes_do_repositorio_sao_parseaveis():
    """
    Guarda-costas: uma migração que o parser não divide direito só apareceria no
    deploy. Aqui ela falha no CI.
    """
    for migracao in listar_arquivos(DIRETORIO_MIGRACOES):
        assert dividir_statements(migracao.sql), f"{migracao.nome} não produziu statement algum"
