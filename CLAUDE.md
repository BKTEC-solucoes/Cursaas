# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cursaas** is a multi-tenant SaaS LMS. Each institution (`faculdade`) is an isolated tenant with its own users, courses, lessons, grades, and white-label visual theme.

Stack: FastAPI (Python 3.12) + SQLAlchemy + MySQL 8.0 · Angular 18 (standalone components) · an Express side-car for Google OAuth only · Docker Compose + Nginx.

Code, comments, DB columns, and API payloads are in **Portuguese** — match that when adding code (`curso`, `aula`, `prova`, `nota`, `presenca`, `faculdade`, `aluno`).

## Commands

```bash
docker compose up --build        # full stack; only nginx publishes a host port (:80)
docker compose up db backend     # backend + db (reachable only inside the compose network)
```

Compose services `backend` (8000) and `frontend` (8080) use `expose`, not `ports` — from the host you reach everything through nginx on `http://localhost`. To hit FastAPI directly, run it outside Docker.

**Frontend:**
```bash
cd frontend && npm install && npm start    # ng serve → http://localhost:4200
npm run build                              # → dist/cursaas-frontend
```
`npm test` and `npm run lint` are declared in `package.json` but **not configured** — `angular.json` defines only `build` and `serve` targets, there are no `.spec.ts` files, and karma/jasmine/eslint are not installed. Both commands fail. Don't cite them as a verification step; verify by building and exercising the UI.

**Backend:**
```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Standalone runs read `backend/.env` (see `config.py`: `load_dotenv(BACKEND_DIR / ".env")`), **not** the repo-root `.env` — that one is only consumed by Compose's `env_file`. `.env.example` at the root documents the variables for both. `SECRET_KEY` has a validator: startup raises unless it is ≥32 chars and not the placeholder.

**Node OAuth side-car:**
```bash
cd backend-node && npm install && npm run dev    # nodemon → :3000
```

**Tests:**
```bash
cd backend && pip install -r requirements-dev.txt
pytest                                  # suíte unitária: sem banco, sem servidor
python seed_ambiente_teste.py --confirmar --banco cursaas   # DESTRUTIVO: recria o banco
python verificacao_multitenant.py       # smoke de tenant/authz; exige servidor no ar
```
`backend/tests/` cobre `TenantContext`, `AuthService`, schemas de curso e a allowlist do middleware — tudo lógica pura, roda em segundos. `pytest.ini` limita a coleta a `tests/`, porque os antigos `test_*.py` disparam rede no import.

Os ~50 scripts operacionais herdados vivem em `backend/tools/{smoke,migracoes,manutencao,launchers}/` — **nenhum é mantido**, vários executam ao serem importados e alguns são destrutivos sem confirmação. Ver `backend/tools/README.md`.

## Architecture

### Multi-tenancy — the core invariant

Nearly every row carries `faculdade_id`. Two layers enforce isolation and **both** matter:

1. `TenantMiddleware` (`backend/app/security/middleware.py`) — ASGI middleware. Decodes the JWT with no DB hit, injects `request.state.faculdade_id` / `user_id` / `tenant_verified`, and returns 401 for a present-but-invalid token. It does **not** block unauthenticated requests; route dependencies do that. Public paths are an explicit allowlist: `_PUBLIC_EXACT` (exact match) and `_PUBLIC_PREFIXES` (`/api/auth/login`, `/api/auth/registro`, `/api/cadastro`, `/api/cursos/catalogo`, `/api/faculdades/publica/tema`, `/uploads/`). New public endpoints must be added there.
2. `TenantContext` (`backend/app/security/tenant.py`) — the route-level dependency, injected as `tc: TenantContext = Depends(tenant_context)`. Use its four methods rather than hand-rolling filters:
   - `tc.filter_query(query, Curso.faculdade_id)` — list endpoints
   - `tc.assert_access(prova.faculdade_id)` — single-resource endpoints (403 on cross-tenant)
   - `tc.require_tenant()` — operations that need a concrete tenant
   - `tc.stamp(novo_curso)` — set `faculdade_id` on new rows before insert

**`faculdade_id is None` does NOT mean super admin.** `TenantContext` carries `is_super_admin` as a separate flag, because there are three states:

| Estado | `is_super_admin` | `faculdade_id` | Efeito |
|---|---|---|---|
| super admin | `True` | `None` | sem filtro, vê todos os tenants |
| super admin com escopo | `True` | `int` | filtra por `faculdade_id` (ver abaixo) |
| vinculado | `False` | `int` | filtra por `faculdade_id` |
| **sem tenant** | `False` | `None` | **não vê nada** (`WHERE false`, 403) |

O terceiro estado é real: admin criado por convite, aluno não aprovado, conta legada. Tratá-lo como super admin era um vazamento entre tenants. Nunca derive isolamento de `faculdade_id is None` — use `TenantContext`. `get_current_faculdade_id` (em `routes/auth.py`) devolve `None` para os dois casos e por isso não serve para autorização.

**Escopo do painel do super admin.** O super admin não tem tenant próprio, então o painel administrativo trabalha com **uma instituição por vez**: o front manda o cabeçalho `X-Faculdade-Id` em toda chamada a `/api` (`authInterceptor` + `FaculdadeAtivaService`) e `tenant_context` devolve um `TenantContext` com `is_super_admin=True` **e** `faculdade_id` preenchido — listagens filtram, `assert_access` bloqueia fora do escopo e `stamp` carimba a instituição escolhida. `faculdadeAtivaGuard` fixa a seleção (primeira faculdade ativa) antes de qualquer rota de `/admin` abrir, e o seletor no cabeçalho do `AdminLayoutComponent` troca de instituição (com reload, porque cada tela carrega os dados no `ngOnInit`). Para usuários com vínculo o cabeçalho não amplia nada: só é aceito se coincidir com o `faculdade_id` real, senão 403. É conveniência de UI, não fronteira de segurança — o valor vem do cliente. As rotas de `/api/faculdades` (gestão das instituições) seguem globais, sem `TenantContext`. As rotas que são super-admin-only e não usam `TenantContext` (`/api/cadastro/admin/*`, `/api/convites`) leem o cabeçalho direto via `ler_escopo_faculdade(request)` e o aplicam como filtro padrão.

`ConviteAdmin` ganhou `faculdade_id` (`database/migration_convite_faculdade.sql`, **precisa ser aplicada à mão em bancos existentes**): o admin convidado nasce vinculado à instituição que estava em gestão quando o convite foi enviado. Sem isso ele caía no estado "sem tenant" — logava e não via nada.

`faculdade_temas.logo_url_override` e `.favicon_url` passaram de `VARCHAR(500)` para `TEXT` (`database/migration_tema_urls_text.sql`, **também manual**): as colunas agora recebem data URIs base64 do upload de logo/favicon, e qualquer PNG estoura 500 caracteres.

For entities without a direct `faculdade_id` (e.g. `Aula`, `CourseRequest`), join through `Curso` and filter on `Curso.faculdade_id`. The middleware logs a `TENANT_AUDIT` warning when a 2xx response came from a non-super-admin with no tenant — that's the signal an endpoint forgot `TenantContext`.

`get_current_user` mora em `app/security/deps.py` (não em `routes/auth.py`, que apenas reexporta) para quebrar o ciclo de import com `security/tenant.py`.

### Roles

Two independent columns on `usuarios`:
- `role` (`RoleEnum`): `admin` | `aluno` | `instituicao` — drives the Angular route areas (`/admin`, `/aluno`, `/instituicao`).
- `admin_role` (`AdminRoleEnum`, nullable): `super_admin` | `instrutor` — sub-role within `role='admin'`. **`NULL` is a meaningful third state**: legacy admins, handled explicitly in `routes/auth.py` (e.g. `is_legacy_admin = current_user.admin_role is None`) and filterable via `?admin_role=legacy`.

Frontend RBAC is a separate, duplicated matrix in `frontend/src/app/core/permissions.ts` (`ROLE_PERMISSIONS` maps `super_admin`/`instrutor` to tokens like `cursos:write`), consumed by `permissionGuard` and `PermissionsService`. Changing what a role can do usually means editing **both** the backend dependency and that table.

JWT claims: `sub` (email), `role`, `admin_role`, `user_id`, `nome`, `faculdade_id`.

### Backend layout (`backend/app/`)

- `main.py` — creates the app, runs `Base.metadata.create_all()` **no lifespan** (startup, não no import — o módulo importa sem tocar no banco), mounts `/uploads/profile_pictures` as static, registers 13 routers. Vídeos **não** são servidos como estático — ver "Entrega de vídeo" abaixo.
- `security/deps.py` — `get_current_user`, isolado para evitar ciclo de import.
- `models/__init__.py` — **all** ORM models and enums live here (~570 lines). `models/models.py` is only a re-export shim for legacy imports; don't add models to it.
- `schemas/__init__.py` — all Pydantic schemas in one file (~1250 lines).
- `routes/` — one file per domain; the large ones are `instituicao.py`, `provas.py`, `faculdades.py`.
- `services/` — business logic (`auth_service`, `email_service`, `avatar_service`, `color_palette`, `institution_registration_service`, …).
- `repositories/` — thin; only two institution repositories exist. Most data access still sits in routes.
- `security/` — `middleware.py` (TenantMiddleware) + `tenant.py` (TenantContext).

Router prefixes: `/api/auth`, `/api/cursos`, `/api/admin`, `/api/aulas`, `/api/provas`, `/api/alunos`, `/api/presenca`, `/api/notas`, `/api/requests`, `/api/convites`, `/api/faculdades`, `/api/cadastro`, plus `instituicao.router` mounted at bare `/api` (its paths carry their own segments). Health: `/health` and `/api/health`.

### Frontend layout (`frontend/src/app/`)

Standalone bootstrap in `main.ts`, no NgModules. `app.routes.ts` lazy-loads `features/admin`, `features/aluno`, `features/instituicao`, and `auth/`; `landing-page/` and `lojas/` are eager.

`core/` holds guards (`auth`, `role`, `public`, `permission`), the single `authInterceptor` (attaches Bearer token, logs out on 401), `theme.resolver.ts`, and services.

**API base URL vem sempre de `environment`.** `environment.ts` (dev) usa URLs absolutas (`http://localhost:8000/api`); `environment.prod.ts` usa caminhos relativos (`/api`, `/uploads`, `/auth/google`), trocado por `fileReplacements` no `angular.json`. Nenhum `localhost` sobrevive ao build de produção — não reintroduza literais.

`VideoService` (`core/services/video.service.ts`) pede a URL assinada e devolve a string pronta para `<video [src]>` — ver "Entrega de vídeo" abaixo. Cacheia por arquivo; `liberar()` no `ngOnDestroy` descarta o cache, porque a URL expira.

### Entrega de vídeo

Autorização e entrega são **duas requisições distintas**, porque `<video src>` não envia cabeçalho nenhum:

1. `GET /api/aulas/video/{filename}/url` — autenticada. Resolve o vídeo pelo sufixo de `caminho_arquivo`, aplica `tc.assert_access(curso.faculdade_id)` e devolve `{"url": "/aulas/video/...?exp=...&sig=..."}`. **Este é o único ponto onde o tenant é verificado.**
2. `GET /api/aulas/video/{filename}?exp&sig` — sem dependência de auth, de propósito. Só valida o HMAC (`app/services/video_url.py`, chave = `SECRET_KEY`).

Com `VIDEO_X_ACCEL=true` (definido no serviço `backend` do Compose, não no `.env`) o passo 2 responde 200 vazio com `X-Accel-Redirect: /_video/<arquivo>`, e o nginx entrega o arquivo pela location `internal` — o byte não passa pelo processo Python, e o player ganha range request e seek. Sem a flag cai no `FileResponse`, que é o caminho do `uvicorn --reload`.

Duas armadilhas:
- A location `/_video/` precisa existir em **ambas** as configs (`default.conf` e `default.tls.conf`) e o volume `uploads_data` precisa estar montado no container do **nginx** — senão o FastAPI responde 200 e o 404 só aparece no log do nginx.
- Não adicione `/api/aulas/video/` a `_PUBLIC_PREFIXES`: a allowlist casa por prefixo e engoliria a rota `/url`, que sairia do middleware sem `request.state.faculdade_id` e quebraria o `tenant_context`.

A assinatura cobre arquivo + expiração, não usuário nem tenant — um link repassado funciona até vencer. O controle é o TTL (`VIDEO_URL_TTL_SECONDS`, 15 min).

### White-label theming

`FaculdadeTema` (1:N with `Faculdade`) stores colors (light + dark), fonts, `border_radius`, `spacing`, `button_style`, `shadow_level`, `layout_type` (topbar/sidebar), `content_width`, animation intensity/transition curve, favicon, login-screen layout/message, and a JSON `page_overrides` map for per-page color/shape overrides. `TemaPreset` holds seeded read-only presets.

Application is three-staged to avoid FOUC:
1. `APP_INITIALIZER` stage 1 — synchronous `themeService.aplicarDoCache()`, reads `localStorage['tenant_theme']` and sets CSS variables on `<html>` before the first render.
2. `APP_INITIALIZER` stage 2 — fires a background fetch if a token exists; does not block bootstrap.
3. `themeResolver` — refetches before route activation. It is currently wired **only on the `/aluno` route**, despite the resolver's own docstring recommending all three authenticated areas.

Stages 2 and 3 dedupe via a 30s in-memory freshness window plus `shareReplay`, so the near-simultaneous calls make one HTTP request. `ThemeService` writes `--primary`, `--secondary`, `--background`, `--radius`, `--space-unit`, the font-size scale, and z-index tokens via `setProperty`, plus `data-shadow` / `data-button-style` / `data-gradient` attributes on `<body>`; legacy aliases (`--primary-color`, …) are kept in sync. Dark mode is a user preference (`light`/`dark`/`system`) stored separately from the tenant theme.

### Auth flow

Email/password → `POST /api/auth/login` → JWT. Google → the Express side-car (`backend-node`, `POST /auth/google` with a Google `idToken`) → app JWT. Token lives in `localStorage`; `authInterceptor` injects it.

O side-car lê a tabela `usuarios` (a mesma do FastAPI) **em modo somente-leitura** e emite um JWT com as claims reais daquela linha. Ele **não cria conta e não atribui papel**: e-mail Google sem conta no Cursaas recebe 403. O provisionamento continua sendo por convite, aprovação de solicitação ou criação pela instituição. No Compose, `JWT_SECRET` vem de `${SECRET_KEY}` — os dois serviços precisam da mesma chave e do mesmo algoritmo, senão os tokens não validam de um lado para o outro.

Admin onboarding goes through `/api/convites`: a super admin issues a token-based invite (`ConviteAdmin`, `INVITE_EXPIRE_HOURS`), and `/auth/aceitar-convite` in the SPA redeems it. With `SMTP_*` unset, `email_service` logs the link to the console instead of sending.

## Database

`database/schema.sql` is the baseline; `database/migration_*.sql` are incremental and **not** run by any migration tool. Because `main.py` calls `Base.metadata.create_all()` no startup, *new* tables appear automatically on boot but existing tables are never altered — so any column addition needs a hand-applied migration file, and the model and the SQL must be changed together.

Para recriar o banco do zero em desenvolvimento, use `backend/seed_ambiente_teste.py` (dropa e recria o schema, semeia 2 tenants e 8 usuários). Ele faz `DROP DATABASE`, e não `drop_all()`, de propósito: o banco de dev pode conter tabelas fora dos modelos.

```bash
docker exec -i cursaas-db-1 mysql -u root -p cursaas < database/migration_xyz.sql
```

(Container name follows the compose project name; confirm with `docker ps`.)

## Infra

- `docker/nginx/default.conf` faz proxy de `/api/`, `/uploads/` e `/auth/` **sem barra final** no `proxy_pass` — a barra faria o nginx trocar o prefixo casado e devolver 404 em toda a API. `client_max_body_size` é 512m, alinhado ao `MAX_FILE_SIZE`.
- **Todo upstream do nginx passa por variável** (`set $upstream_backend backend:8000;` + `resolver 127.0.0.11`), nos dois arquivos de config. Com o nome literal o nginx resolve o IP uma única vez, ao carregar a config, e isso quebra de duas formas: upstream ausente no boot impede o nginx de iniciar, e upstream que troca de IP passa a receber 502 para sempre (`connect() failed (113: Host is unreachable)`) — qualquer `docker compose restart backend` derrubava a API até um reload manual. Com a variável a resolução é por requisição, então cada rota degrada sozinha e se recupera quando o serviço volta. `proxy_pass http://$var;` continua sendo "sem URI" e repassa a URI original — **não** acrescente barra nem `$request_uri`.
- O Compose tem 5 serviços: `db`, `backend`, `backend-node`, `frontend`, `nginx`. Uploads ficam no volume `uploads_data` — sem ele os vídeos somem a cada recriação do container.
- `ALLOWED_ORIGINS` defaults to `["http://localhost:4200", "http://localhost:3000"]` in `config.py`; when set via env it must be a JSON array. Atrás do nginx o SPA usa mesma origem, então CORS só importa no `ng serve`.
- O `.dockerignore` na raiz **não é opcional**: os três builds usam `context: .` e os Dockerfiles fazem `COPY <dir>/ /app/` *depois* de instalar as dependências, então sem ele o `venv`/`node_modules` do host é copiado por cima do que foi instalado no container (em host Windows isso troca binários linux por win32 e quebra o build do Angular), e o `backend/.env` vai assado na imagem.
- O Compose precisa de um `.env` na **raiz** (`env_file`), separado do `backend/.env`: o da raiz aponta para o host `db`, o do backend para `localhost`. Sem o da raiz o `compose up` falha por variável indefinida.
- `docker compose up --build` **foi validado end-to-end**: 5 serviços sobem, o SPA é servido pelo nginx, `/api/` chega intacto ao FastAPI, o build de produção usa caminhos relativos e o schema nasce completo via `create_all()`. O `backend-node` fica em restart loop enquanto `GOOGLE_CLIENT_ID` for o placeholder — é validação do próprio side-car, e só `/auth/google` é afetado.

### Tensão conhecida no modelo de dados

`usuarios.faculdade_id` é uma coluna **singular**, mas `vinculos_aluno_faculdade` é N:N. O banco permite um aluno em várias faculdades; o `TenantContext` lê `faculdade_id` e só enxerga uma. Um aluno com dois vínculos fica preso ao tenant da coluna. Resolver isso é redesenho de autorização, não conserto pontual.

## Environment variables

Set in `.env` (root, for Compose) and/or `backend/.env` (for standalone runs): `DB_*` + `DATABASE_URL`, `SECRET_KEY` (≥32 chars), `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `UPLOAD_DIR`, `MAX_FILE_SIZE`, `VIDEO_X_ACCEL`, `VIDEO_URL_TTL_SECONDS`, `ALLOWED_ORIGINS`, `FRONTEND_URL` (invite links), `INVITE_EXPIRE_HOURS`, `SMTP_*`, `PERCENTUAL_PRESENCA_MINIMA_PADRAO`. The Google client ID lives in `frontend/src/environments/environment.ts` and can be set with `scripts/set-google-client-id.ps1`.
