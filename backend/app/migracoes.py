"""
Aplicador de migrações SQL.

Substitui o procedimento manual (`docker exec ... mysql < arquivo.sql` a cada
deploy). Os arquivos ficam em ``backend/migracoes/`` e são aplicados **uma única
vez**, na ordem do nome, com o que já rodou registrado na tabela
``schema_migracoes``.

Por que em ``backend/migracoes/`` e não em ``database/``
--------------------------------------------------------
Os `.sql` precisam viajar dentro da imagem do backend (o Dockerfile faz
``COPY backend/ /app/``) para que o runner os enxergue em produção. ``database/``
não entra em imagem nenhuma.

``database/migration_*.sql`` continua existindo como **registro histórico**: são
as migrações já aplicadas à mão em dev e em produção, e o runner **não olha para
elas** — reaplicar aqueles ALTER quebraria banco existente e não faz falta em
banco novo, que nasce completo do ``create_all``.

Regras para escrever uma migração nova
--------------------------------------
1. Nome: ``AAAAMMDD_HHMM_descricao.sql`` — a ordem de aplicação é a ordem
   alfabética do nome, então o prefixo de data é o que garante a sequência.
2. **Escreva idempotente sempre que der** (``INSERT ... WHERE NOT EXISTS``,
   ``CREATE TABLE IF NOT EXISTS``, ``DROP ... IF EXISTS``). MySQL faz commit
   implícito em DDL: um arquivo que falha no terceiro statement deixa os dois
   primeiros aplicados, e a correção é rodar o arquivo de novo.
3. ``ADD COLUMN`` em tabela grande trava escrita enquanto roda. Nesta VPS
   (1 vCPU) isso é a diferença entre um restart de segundos e o site fora do ar
   — migração pesada ainda merece janela combinada, não um push na sexta.

Uso
---
Automático no startup do FastAPI (``app.main.lifespan``) e no ``scripts/deploy.sh``,
que roda o passo abaixo com a imagem nova antes de trocar os containers::

    python -m app.migracoes            # aplica as pendentes
    python -m app.migracoes --listar   # só mostra o estado, não altera nada
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Iterable, List, NamedTuple

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

#: ``backend/migracoes`` — irmão de ``backend/app``.
DIRETORIO_MIGRACOES = Path(__file__).resolve().parent.parent / "migracoes"

#: Nome do lock consultivo do MySQL. Duas réplicas do backend subindo ao mesmo
#: tempo aplicariam a mesma migração em paralelo; a segunda espera aqui.
NOME_LOCK = "cursaas_migracoes"

#: Segundos que uma instância espera pelo lock antes de desistir. Uma migração
#: longa não pode fazer as outras instâncias falharem o boot.
TIMEOUT_LOCK = 300

DDL_REGISTRO = """
CREATE TABLE IF NOT EXISTS schema_migracoes (
    arquivo     VARCHAR(255) NOT NULL,
    checksum    CHAR(64)     NOT NULL,
    aplicada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (arquivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
"""


class Migracao(NamedTuple):
    nome: str
    caminho: Path
    sql: str

    @property
    def checksum(self) -> str:
        return hashlib.sha256(self.sql.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Leitura e parsing
# ---------------------------------------------------------------------------

def listar_arquivos(diretorio: Path = DIRETORIO_MIGRACOES) -> List[Migracao]:
    """Migrações do diretório, em ordem alfabética (= cronológica pelo prefixo)."""
    if not diretorio.is_dir():
        return []
    return [
        Migracao(nome=caminho.name, caminho=caminho, sql=caminho.read_text(encoding="utf-8"))
        for caminho in sorted(diretorio.glob("*.sql"))
    ]


def dividir_statements(sql: str) -> List[str]:
    """
    Quebra um script em statements individuais.

    O driver (PyMySQL) não executa múltiplos statements numa chamada, então a
    divisão é nossa. Dividir no ``;`` cru não serve: ``migration_tema_urls_text.sql``
    tem um ``COMMENT 'Override de logo; se NULL...'`` — o ponto e vírgula dentro
    da string cortaria o statement no meio. Este parser ignora ``;`` dentro de
    aspas simples, aspas duplas, crases e comentários, e entende ``DELIMITER``
    (necessário para trigger/procedure, onde o corpo tem ``;``).
    """
    statements: List[str] = []
    atual: List[str] = []
    delimitador = ";"

    i = 0
    n = len(sql)
    while i < n:
        c = sql[i]
        resto = sql[i:]

        # -- comentário de linha (MySQL exige espaço ou fim de linha após "--")
        if resto.startswith("--") and (len(resto) == 2 or resto[2] in " \t\r\n"):
            fim = sql.find("\n", i)
            i = n if fim == -1 else fim + 1
            continue

        if c == "#":
            fim = sql.find("\n", i)
            i = n if fim == -1 else fim + 1
            continue

        # /* comentário de bloco */
        if resto.startswith("/*"):
            fim = sql.find("*/", i + 2)
            i = n if fim == -1 else fim + 2
            continue

        # DELIMITER só vale no início de uma linha e não é SQL: é diretiva do
        # cliente. Trocamos o terminador e seguimos.
        if (
            resto[:9].upper() == "DELIMITER"
            and (i == 0 or sql[i - 1] == "\n")
            and len(resto) > 9
            and resto[9] in " \t"
        ):
            fim = sql.find("\n", i)
            linha = sql[i : n if fim == -1 else fim]
            novo = linha[9:].strip()
            if novo:
                delimitador = novo
            i = n if fim == -1 else fim + 1
            continue

        # Literais e identificadores citados: copiados inteiros, sem interpretar.
        if c in "'\"`":
            aspas = c
            atual.append(c)
            i += 1
            while i < n:
                ch = sql[i]
                # Barra invertida escapa em string, mas não em `identificador`.
                if ch == "\\" and aspas != "`" and i + 1 < n:
                    atual.append(sql[i : i + 2])
                    i += 2
                    continue
                if ch == aspas:
                    # '' e "" dentro da string são o próprio caractere, escapado.
                    if i + 1 < n and sql[i + 1] == aspas:
                        atual.append(ch * 2)
                        i += 2
                        continue
                    atual.append(ch)
                    i += 1
                    break
                atual.append(ch)
                i += 1
            continue

        if sql.startswith(delimitador, i):
            statements.append("".join(atual))
            atual = []
            i += len(delimitador)
            continue

        atual.append(c)
        i += 1

    statements.append("".join(atual))
    return [s.strip() for s in statements if s.strip()]


# ---------------------------------------------------------------------------
# Aplicação
# ---------------------------------------------------------------------------

def _ja_aplicadas(conexao) -> dict[str, str]:
    linhas = conexao.execute(text("SELECT arquivo, checksum FROM schema_migracoes")).all()
    return {arquivo: checksum for arquivo, checksum in linhas}


def _aplicar_uma(conexao, migracao: Migracao) -> None:
    statements = dividir_statements(migracao.sql)
    for indice, statement in enumerate(statements, start=1):
        try:
            conexao.execute(text(statement))
        except Exception:
            logger.error(
                "Migração %s falhou no statement %d/%d: %.200s",
                migracao.nome,
                indice,
                len(statements),
                statement,
            )
            raise
    conexao.execute(
        text(
            "INSERT INTO schema_migracoes (arquivo, checksum) VALUES (:arquivo, :checksum)"
        ),
        {"arquivo": migracao.nome, "checksum": migracao.checksum},
    )


def aplicar_pendentes(
    engine: Engine,
    diretorio: Path = DIRETORIO_MIGRACOES,
    migracoes: Iterable[Migracao] | None = None,
) -> List[str]:
    """
    Aplica as migrações ainda não registradas. Devolve os nomes aplicados agora.

    Levanta a exceção original se alguma falhar — startup que segue com o schema
    a meio caminho vira 500 em rota aleatória, o que é bem pior de diagnosticar
    do que um boot que para e diz qual arquivo quebrou.
    """
    pendentes_no_disco = list(migracoes) if migracoes is not None else listar_arquivos(diretorio)
    if not pendentes_no_disco:
        return []

    aplicadas_agora: List[str] = []

    with engine.begin() as conexao:
        conexao.execute(text(DDL_REGISTRO))

    with engine.connect() as conexao:
        obtido = conexao.execute(
            text("SELECT GET_LOCK(:nome, :timeout)"), {"nome": NOME_LOCK, "timeout": TIMEOUT_LOCK}
        ).scalar()
        if obtido != 1:
            raise RuntimeError(
                f"Não foi possível obter o lock '{NOME_LOCK}' em {TIMEOUT_LOCK}s — "
                "outra instância pode estar aplicando migrações."
            )
        try:
            registradas = _ja_aplicadas(conexao)

            for migracao in pendentes_no_disco:
                checksum_registrado = registradas.get(migracao.nome)
                if checksum_registrado is not None:
                    if checksum_registrado != migracao.checksum:
                        # Editar migração já aplicada faz o banco divergir do
                        # arquivo em silêncio. Não reaplicamos (seria pior), só
                        # deixamos rastro.
                        logger.warning(
                            "Migração %s mudou depois de aplicada (checksum difere). "
                            "O banco continua com a versão antiga — crie um arquivo novo.",
                            migracao.nome,
                        )
                    continue

                logger.info("Aplicando migração %s...", migracao.nome)
                _aplicar_uma(conexao, migracao)
                conexao.commit()
                aplicadas_agora.append(migracao.nome)
                logger.info("Migração %s aplicada.", migracao.nome)
        finally:
            conexao.execute(text("SELECT RELEASE_LOCK(:nome)"), {"nome": NOME_LOCK})

    if not aplicadas_agora:
        logger.info("Nenhuma migração pendente (%d no diretório).", len(pendentes_no_disco))

    return aplicadas_agora


def estado(engine: Engine, diretorio: Path = DIRETORIO_MIGRACOES) -> List[tuple[str, bool]]:
    """(nome, aplicada) de cada migração do diretório. Não altera nada."""
    with engine.begin() as conexao:
        conexao.execute(text(DDL_REGISTRO))
        registradas = _ja_aplicadas(conexao)
    return [(m.nome, m.nome in registradas) for m in listar_arquivos(diretorio)]


def _main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Aplica as migrações SQL pendentes.")
    parser.add_argument(
        "--listar",
        action="store_true",
        help="apenas mostra quais migrações estão aplicadas, sem alterar o banco",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="[migracoes] %(levelname)s %(message)s")

    from app.database import engine

    if args.listar:
        for nome, aplicada in estado(engine):
            print(f"  [{'x' if aplicada else ' '}] {nome}")
        return 0

    aplicadas = aplicar_pendentes(engine)
    for nome in aplicadas:
        print(f"aplicada: {nome}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
