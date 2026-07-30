# backend/tools

Scripts operacionais herdados, movidos da raiz de `backend/` e do repositório.
Estavam soltos (~50 arquivos) misturados ao código da aplicação.

**Nenhum destes é mantido.** Foram escritos para resolver problemas pontuais em
momentos específicos e têm graus variados de obsolescência. Vários **executam ao
serem importados** — não há `if __name__ == "__main__"`. Abra e leia antes de
rodar qualquer um.

Todos rodam com o Python do venv, a partir da raiz do repositório:

```bash
backend/venv/Scripts/python.exe backend/tools/<categoria>/<script>.py
```

O bootstrap de `sys.path` no topo de cada arquivo resolve o `import app.*`.

---

## `smoke/` — verificações manuais contra um servidor rodando

Fazem `requests.post` contra `http://localhost:8000` com **credenciais
hardcoded**. Não são pytest e não são coletados por ele (ver `pytest.ini`).
Exigem servidor no ar e usuários compatíveis já semeados.

Para testes de verdade, use:

- `backend/tests/` — suíte pytest (unitária, sem banco): `pytest`
- `backend/verificacao_multitenant.py` — smoke de isolamento multi-tenant e
  autorização, contra servidor rodando

## `migracoes/` — migrações aplicadas à mão

Contrapartes em Python dos `database/migration_*.sql`. O projeto **não tem
ferramenta de migração**: `create_all()` cria tabelas novas no startup, mas nunca
altera tabelas existentes, então adicionar coluna exige rodar isso à mão.

Já foram aplicadas no banco atual. Rodar de novo é, na melhor hipótese, no-op.

## `manutencao/` — inspeção e correção pontual

`check_*` e `debug_*` só leem. `fix_*` **escrevem**.

⚠️ **Destrutivos, sem confirmação nenhuma:**

- `drop_instituicoes.py` — dropa a tabela `instituicoes`
- `recreate_instituicoes.py` — dropa e recria
- `fix_*_encoding.py` — reescrevem dados em massa

Para recriar o ambiente do zero, prefira `backend/seed_ambiente_teste.py`, que
exige `--confirmar` e um `--banco` que precisa bater com o `DATABASE_URL`.

## `launchers/` — formas antigas de subir o servidor

Redundantes. A forma canônica é:

```bash
uvicorn app.main:app --reload --port 8000
```

`start_server.py` está **quebrado**: tem `c:\projetos\Cursaas\backend`
hardcoded, um caminho que não existe mais.
