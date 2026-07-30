#!/usr/bin/env bash
#
# Emissao inicial do certificado Let's Encrypt para bktec.dev.br.
#
# Rode UMA vez, no servidor, depois que o registro A do dominio ja apontar para
# este host. A renovacao seguinte e automatica: o servico `certbot` do
# compose.tls.yml roda `certbot renew` a cada 12h.
#
#   cd /opt/cursaas && ./scripts/emitir-certificado.sh seu-email@dominio.com
#
set -euo pipefail

DOMINIO="bktec.dev.br"
EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "uso: $0 <email-para-avisos-de-expiracao>" >&2
  exit 1
fi

IP_ESPERADO=$(curl -fsS https://api.ipify.org)
echo "IP deste servidor: $IP_ESPERADO"

# A causa numero um de falha aqui e o DNS apontando para outro host. O certbot
# so descobre isso depois de gastar uma tentativa, e o Let's Encrypt limita
# falhas por dominio — entao vale conferir antes.
for nome in "$DOMINIO" "www.$DOMINIO"; do
  resolvido=$(getent ahostsv4 "$nome" | awk 'NR==1{print $1}' || true)
  echo "  $nome -> ${resolvido:-<nao resolve>}"
  if [ "$resolvido" != "$IP_ESPERADO" ]; then
    echo "ABORTADO: $nome nao aponta para este servidor." >&2
    echo "Corrija o registro A no Registro.br e espere propagar." >&2
    exit 1
  fi
done

# O nginx precisa estar no ar servindo /.well-known/acme-challenge/ pelo webroot
# compartilhado; e assim que o Let's Encrypt confirma que voce controla o dominio.
docker compose -f compose.yml -f compose.tls.yml up -d nginx

docker compose -f compose.yml -f compose.tls.yml run --rm \
  --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMINIO" -d "www.$DOMINIO" \
  --email "$EMAIL" --agree-tos --no-eff-email

docker compose -f compose.yml -f compose.tls.yml up -d
echo "Certificado emitido. Stack no ar em https://$DOMINIO"
