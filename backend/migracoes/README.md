# Migrações

Arquivos `.sql` aplicados **automaticamente e uma única vez** por
[`app/migracoes.py`](../app/migracoes.py). Não existe mais passo manual: o
backend aplica no startup, e `scripts/deploy.sh` aplica antes de trocar os
containers.

## Criar uma migração

1. Crie `AAAAMMDD_HHMM_descricao.sql` neste diretório. **A ordem de aplicação é
   a ordem alfabética do nome** — o prefixo de data é o que garante a sequência.
2. Altere o modelo em `app/models/__init__.py` no mesmo commit. `create_all()`
   cria tabelas novas mas nunca altera as existentes; modelo e SQL divergentes
   viram 500 em produção e schema certo em banco novo, que é o pior dos casos
   para diagnosticar.
3. Prefira SQL idempotente: `CREATE TABLE IF NOT EXISTS`, `DROP ... IF EXISTS`,
   `INSERT ... WHERE NOT EXISTS`. MySQL faz commit implícito em DDL — um arquivo
   que falha no terceiro statement deixa os dois primeiros aplicados, e o
   conserto é rodar o arquivo de novo.
4. Nunca edite um arquivo já aplicado: o runner compara o checksum, avisa no log
   e **não** reaplica. Correção é arquivo novo.

`ADD COLUMN` em tabela grande trava escrita enquanto roda. Nesta VPS (1 vCPU)
isso é a diferença entre um restart de segundos e o site fora do ar — migração
pesada ainda merece janela combinada.

## Conferir o estado

```bash
docker compose run --rm --no-deps -T backend python -m app.migracoes --listar
```

`--listar` só lê. Sem a flag, aplica as pendentes. A tabela `schema_migracoes`
(arquivo, checksum, data) é o registro do que já rodou.

## `database/migration_*.sql`

Aquele diretório é **registro histórico**: migrações aplicadas à mão antes deste
runner existir, já presentes em dev e em produção. O runner não olha para elas —
reaplicar aqueles `ALTER` quebraria banco existente, e banco novo já nasce
completo pelo `create_all()`. Migração nova vai aqui, não lá.
