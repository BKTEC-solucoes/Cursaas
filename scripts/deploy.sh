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
# 2. Migracoes
# ---------------------------------------------------------------------------
# O projeto nao usa ferramenta de migracao: `Base.metadata.create_all()` cria
# tabelas novas no boot, mas nunca altera as existentes. Uma coluna adicionada
# so existe se alguem rodar o .sql a mao.
#
# Aplicar automaticamente seria pior do que parar: um ALTER em tabela grande
# trava o banco, e alguns arquivos aqui nao sao reversiveis. Entao o deploy
# ABORTA quando chega migracao nova, antes de trocar qualquer container - o
# site continua rodando a versao antiga, que e consistente com o banco antigo.
if [ "$ANTES" != "$DEPOIS" ]; then
  NOVAS=$(git diff --name-only --diff-filter=A "$ANTES" "$DEPOIS" -- 'database/migration_*.sql' || true)
  if [ -n "$NOVAS" ] && [ "${IGNORAR_MIGRACOES:-}" != "1" ]; then
    log "ABORTADO: migracoes novas neste intervalo, aplique-as antes de seguir:"
    echo "$NOVAS" | sed 's/^/  /'
    cat <<'AJUDA'

  Na VPS:
    cd /opt/cursaas
    set -a; . ./.env; set +a
    docker exec -i cursaas-db-1 mysql -u root -p"$DB_ROOT_PASSWORD" "$DB_NAME" < database/<arquivo>.sql

  Depois rode o deploy de novo. Se a migracao ja estiver aplicada (ou nao for
  necessaria agora), pule esta checagem com IGNORAR_MIGRACOES=1.
AJUDA
    # Volta o diretorio para o commit que esta de fato rodando, senao a proxima
    # execucao ve "sem commits novos" e deixa passar a migracao pendente.
    git reset --hard "$ANTES" --quiet
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 3. Backup
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
# 4. Build (site ainda no ar)
# ---------------------------------------------------------------------------
log "construindo imagens..."
"${COMPOSE[@]}" build

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
  if curl -fsS --max-time 5 https://bktec.dev.br/api/health >/dev/null 2>&1; then
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
curl -fsS --max-time 10 -o /dev/null https://bktec.dev.br/ \
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
