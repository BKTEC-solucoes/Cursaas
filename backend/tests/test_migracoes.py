"""Aplicador de migrações: parser e runner. Sem banco, sem servidor."""
import logging
from pathlib import Path

import pytest

from app.migracoes import (
    DIRETORIO_MIGRACOES,
    Migracao,
    aplicar_pendentes,
    dividir_statements,
    estado,
    listar_arquivos,
)


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


# ── Dublê de engine ──────────────────────────────────────────────────────────
#
# As regras que o runner codifica — o que roda, em que ordem, o que acontece
# quando um arquivo falha — mexem em dados de verdade e não dão para conferir
# olhando. Um MySQL de verdade tiraria a suíte do "sem banco, sem servidor", e
# SQLite não serve: `GET_LOCK` e `ENGINE=InnoDB` são MySQL. Então o dublê abaixo
# emula a conexão, guardando `schema_migracoes` num dict.


class _Resultado:
    def __init__(self, linhas=(), escalar=None):
        self._linhas = list(linhas)
        self._escalar = escalar

    def all(self):
        return self._linhas

    def scalar(self):
        return self._escalar


class ConexaoFalsa:
    """Entende só os statements que `app.migracoes` emite; o resto é registrado."""

    def __init__(self, estado_engine):
        self._engine = estado_engine

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, clause, params=None):
        sql = str(clause).strip()

        if sql.startswith("SELECT GET_LOCK"):
            return _Resultado(escalar=1 if self._engine.lock_disponivel else 0)
        if sql.startswith("SELECT RELEASE_LOCK"):
            self._engine.lock_liberado = True
            return _Resultado(escalar=1)
        if sql.startswith("SELECT arquivo, checksum FROM schema_migracoes"):
            return _Resultado(linhas=list(self._engine.registro.items()))
        if sql.startswith("INSERT INTO schema_migracoes"):
            self._engine.registro[params["arquivo"]] = params["checksum"]
            return _Resultado()
        if sql.startswith("CREATE TABLE IF NOT EXISTS schema_migracoes"):
            return _Resultado()

        # Statement de migração de verdade.
        if self._engine.falhar_em and self._engine.falhar_em in sql:
            raise RuntimeError("ERROR 1064 (falha simulada)")
        self._engine.executados.append(sql)
        return _Resultado()

    def commit(self):
        self._engine.commits += 1


class EngineFalsa:
    def __init__(self, falhar_em: str | None = None, lock_disponivel: bool = True):
        self.registro: dict[str, str] = {}   # schema_migracoes
        self.executados: list[str] = []      # SQL de migração que chegou ao "banco"
        self.commits = 0
        self.falhar_em = falhar_em
        self.lock_disponivel = lock_disponivel
        self.lock_liberado = False

    def begin(self):
        return ConexaoFalsa(self)

    def connect(self):
        return ConexaoFalsa(self)


def _migracao(nome: str, sql: str) -> Migracao:
    return Migracao(nome=nome, caminho=Path(nome), sql=sql)


@pytest.fixture
def tres_migracoes() -> list[Migracao]:
    return [
        _migracao("20260101_0900_a.sql", "ALTER TABLE a ADD COLUMN marca_a INT;"),
        _migracao("20260201_0900_b.sql", "ALTER TABLE b ADD COLUMN marca_b INT;"),
        _migracao("20260301_0900_c.sql", "ALTER TABLE c ADD COLUMN marca_c INT;"),
    ]


# ── Runner: aplicação e idempotência ─────────────────────────────────────────

def test_primeira_execucao_aplica_tudo_e_registra(tres_migracoes):
    engine = EngineFalsa()

    aplicadas = aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert aplicadas == [m.nome for m in tres_migracoes]
    assert set(engine.registro) == {m.nome for m in tres_migracoes}
    assert len(engine.executados) == 3


def test_execucao_seguinte_nao_repete_nada(tres_migracoes):
    """O ponto do `schema_migracoes`: reexecutar o deploy é no-op."""
    engine = EngineFalsa()
    aplicar_pendentes(engine, migracoes=tres_migracoes)
    engine.executados.clear()

    aplicadas = aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert aplicadas == []
    assert engine.executados == []


def test_so_a_pendente_roda_quando_entra_arquivo_novo(tres_migracoes):
    engine = EngineFalsa()
    aplicar_pendentes(engine, migracoes=tres_migracoes[:2])
    engine.executados.clear()

    aplicadas = aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert aplicadas == ["20260301_0900_c.sql"]
    assert engine.executados == ["ALTER TABLE c ADD COLUMN marca_c INT"]


def test_ordem_de_aplicacao_segue_a_lista(tres_migracoes):
    engine = EngineFalsa()
    aplicar_pendentes(engine, migracoes=tres_migracoes)
    assert engine.executados == [
        "ALTER TABLE a ADD COLUMN marca_a INT",
        "ALTER TABLE b ADD COLUMN marca_b INT",
        "ALTER TABLE c ADD COLUMN marca_c INT",
    ]


# ── Runner: migração editada depois de aplicada ──────────────────────────────

def test_checksum_divergente_avisa_e_nao_reaplica(tres_migracoes, caplog):
    """
    Editar migração já aplicada faz o banco divergir do arquivo em silêncio.
    Reaplicar seria pior (o ALTER já rodou), então o runner só deixa rastro.
    """
    engine = EngineFalsa()
    aplicar_pendentes(engine, migracoes=tres_migracoes)
    engine.executados.clear()

    editada = _migracao(tres_migracoes[1].nome, "ALTER TABLE b ADD COLUMN outra_coisa INT;")
    with caplog.at_level(logging.WARNING, logger="app.migracoes"):
        aplicadas = aplicar_pendentes(
            engine, migracoes=[tres_migracoes[0], editada, tres_migracoes[2]]
        )

    assert aplicadas == []
    assert engine.executados == []
    assert "mudou depois de aplicada" in caplog.text
    assert editada.nome in caplog.text


# ── Runner: falha ────────────────────────────────────────────────────────────

def test_falha_propaga_e_nao_registra_a_que_quebrou(tres_migracoes):
    """
    Boot que segue com o schema a meio caminho vira 500 em rota aleatória. A
    exceção sobe de propósito — no deploy, aborta antes de trocar os containers.
    """
    engine = EngineFalsa(falhar_em="marca_b")

    with pytest.raises(RuntimeError):
        aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert "20260101_0900_a.sql" in engine.registro   # a anterior ficou aplicada
    assert "20260201_0900_b.sql" not in engine.registro
    assert "20260301_0900_c.sql" not in engine.registro


def test_falha_libera_o_lock(tres_migracoes):
    """Sem o `finally`, a instância seguinte esperaria 300s e falharia o boot."""
    engine = EngineFalsa(falhar_em="marca_a")

    with pytest.raises(RuntimeError):
        aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert engine.lock_liberado


def test_lock_indisponivel_aborta_com_mensagem(tres_migracoes):
    engine = EngineFalsa(lock_disponivel=False)

    with pytest.raises(RuntimeError, match="lock"):
        aplicar_pendentes(engine, migracoes=tres_migracoes)

    assert engine.registro == {}


# ── Runner: diretório vazio e `estado` ───────────────────────────────────────

def test_sem_migracoes_nao_toca_no_banco():
    engine = EngineFalsa()
    assert aplicar_pendentes(engine, migracoes=[]) == []
    assert engine.registro == {}
    assert engine.executados == []


def test_estado_marca_aplicadas_e_pendentes(tmp_path: Path, tres_migracoes):
    for migracao in tres_migracoes:
        (tmp_path / migracao.nome).write_text(migracao.sql, encoding="utf-8")

    engine = EngineFalsa()
    aplicar_pendentes(engine, migracoes=tres_migracoes[:2])

    assert estado(engine, tmp_path) == [
        ("20260101_0900_a.sql", True),
        ("20260201_0900_b.sql", True),
        ("20260301_0900_c.sql", False),
    ]
