#!/usr/bin/env bash
#
# Deploy da stack no servidor. Roda NA VPS, em /opt/cursaas.
#
#   ./scripts/deploy.sh
#
# E o unico caminho de deploy: o workflow .github/workflows/deploy.yml se
# conecta por SSH e executa exatamente este script. Rodar a mao e o mesmo
# procedimento, entao os dois nunca divergem.
#
# Ordem: puxa -> constroi -> so entao troca os containers. Construir antes de
# `up -d` mantem o site no ar durante a compilacao, que nesta VPS (1 vCPU) leva
# varios minutos. A indisponibilidade fica restrita ao restart, poucos segundos.
set -euo pipefail

RAIZ="/opt/cursaas"
COMPOSE=(docker compose -f compose.yml -f compose.tls.yml)
DIR_BACKUP="/opt/cursaas-backups"

cd "$RAIZ"

# Dois deploys simultaneos (push em sequencia rapida) disputariam o mesmo
# diretorio de trabalho e o mesmo daemon do Docker. O segundo espera.
exec 9>/var/lock/cursaas-deploy.lock
flock 9

log() { echo "[deploy] $*"; }

# ---------------------------------------------------------------------------
# 1. Codigo
# ---------------------------------------------------------------------------
ANTES=$(git rev-parse HEAD)
git fetch origin main --quiet

# --ff-only de proposito: se alguem editou arquivo versionado no servidor, o
# merge falha aqui em vez de gerar conflito no meio do deploy. Os .env NAO sao
# versionados, entao configuracao local nunca e tocada.
git merge --ff-only origin/main
DEPOIS=$(git rev-parse HEAD)

if [ "$ANTES" = "$DEPOIS" ]; then
  log "sem commits novos ($(git rev-parse --short HEAD)) - seguindo assim mesmo para reconciliar imagens"
else
  log "$(git rev-parse --short "$ANTES") -> $(git rev-parse --short "$DEPOIS")"
fi

# ---------------------------------------------------------------------------
# 2. Backup
# ---------------------------------------------------------------------------
set -a; . ./.env; set +a
mkdir -p "$DIR_BACKUP"
ARQ_BACKUP="$DIR_BACKUP/pre-deploy-$(date +%Y%m%d%H%M%S).sql.gz"
docker exec cursaas-db-1 mysqldump -u root -p"$DB_ROOT_PASSWORD" \
  --single-transaction --routines "$DB_NAME" 2>/dev/null | gzip > "$ARQ_BACKUP"
log "backup: $ARQ_BACKUP ($(du -h "$ARQ_BACKUP" | cut -f1))"

# Disco de 48G nao aguenta backup por deploy para sempre.
ls -1t "$DIR_BACKUP"/pre-deploy-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --

# ---------------------------------------------------------------------------
# 3. Build (site ainda no ar)
# ---------------------------------------------------------------------------
log "construindo imagens..."
"${COMPOSE[@]}" build

# ---------------------------------------------------------------------------
# 4. Migracoes
# ---------------------------------------------------------------------------
# `backend/migracoes/*.sql` sao aplicados por `app.migracoes`, que registra o
# que ja rodou em `schema_migracoes` - reexecutar e no-op. O backend tambem
# aplica no proprio startup; rodar aqui, num container efemero da imagem NOVA e
# com os containers antigos ainda no ar, e o que garante a ordem certa:
#
#   - migracao quebrada aborta o deploy ANTES da troca, com o site rodando a
#     versao antiga e o backup desta execucao ja feito;
#   - quando o backend novo sobe, o schema ja esta atualizado, entao nao existe
#     janela em que o codigo novo fala com o banco velho.
#
# --no-deps: o db ja esta no ar; nao queremos que o `run` recrie servico algum.
if [ "${PULAR_MIGRACOES:-}" = "1" ]; then
  log "migracoes puladas (PULAR_MIGRACOES=1)"
else
  log "aplicando migracoes..."
  if ! "${COMPOSE[@]}" run --rm --no-deps -T backend python -m app.migracoes; then
    log "ABORTADO: falha ao aplicar migracoes - containers nao foram trocados"
    log "backup desta execucao: $ARQ_BACKUP"
    # Volta o diretorio para o commit que esta de fato rodando, senao a proxima
    # execucao ve "sem commits novos" e passa direto pela migracao quebrada.
    git reset --hard "$ANTES" --quiet
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 5. Troca dos containers
# ---------------------------------------------------------------------------
log "subindo..."
"${COMPOSE[@]}" up -d --remove-orphans

# Imagens orfas das versoes anteriores enchem o disco em poucas dezenas de
# deploys. `-f` sem `-a`: so o que nao esta referenciado por nenhum container.
docker image prune -f >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 6. Verificacao
# ---------------------------------------------------------------------------
log "aguardando a API responder..."
for tentativa in $(seq 1 30); do
  if curl -fsS --max-time 5 https://cursaas.bktec.dev.br/api/health >/dev/null 2>&1; then
    log "API OK apos ${tentativa}x"
    break
  fi
  if [ "$tentativa" = "30" ]; then
    log "FALHOU: /api/health nao respondeu em ~60s"
    "${COMPOSE[@]}" ps
    "${COMPOSE[@]}" logs --tail 40 backend nginx
    exit 1
  fi
  sleep 2
done

# O SPA e servido pelo nginx a partir da imagem do frontend; se o build do
# Angular saiu vazio, a raiz responde 404 e so isso pega.
curl -fsS --max-time 10 -o /dev/null https://cursaas.bktec.dev.br/ \
  || { log "FALHOU: o SPA nao esta sendo servido em /"; exit 1; }

# Nao aborta o deploy: o side-car so afeta o login com Google, e o resto do
# site funciona sem ele. Mas silenciar seria pior - ele passou meses em restart
# loop sem ninguem notar.
if [ "$("${COMPOSE[@]}" ps -q backend-node | xargs -r docker inspect -f '{{.State.Running}}')" != "true" ]; then
  log "AVISO: backend-node fora do ar - login com Google indisponivel"
  "${COMPOSE[@]}" logs --tail 15 backend-node
fi

log "deploy concluido em $(git rev-parse --short HEAD)"
"${COMPOSE[@]}" ps --format '  {{.Name}}  {{.Status}}'
