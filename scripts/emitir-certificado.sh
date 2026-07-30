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

# A emissao roda com o compose BASE, em HTTP puro.
#
# Subir o overlay de TLS aqui seria circular: default.tls.conf declara
# ssl_certificate apontando para um arquivo que so vai existir depois desta
# emissao, e o nginx se recusa a iniciar sem ele. Sem nginx no ar, nada serve o
# desafio, e a emissao falha — travando os dois lados.
#
# O compose base ja monta o mesmo volume certbot_www e serve
# /.well-known/acme-challenge/ a partir dele, entao o desafio funciona em HTTP.
docker compose up -d nginx

# `docker run` e nao `docker compose run`: o servico certbot so existe no
# overlay de TLS, que ainda nao pode ser carregado neste ponto. Os volumes ja
# foram criados pelo compose base (prefixo do projeto = nome do diretorio).
PROJETO=$(basename "$PWD")
docker run --rm \
  -v "${PROJETO}_certbot_conf:/etc/letsencrypt" \
  -v "${PROJETO}_certbot_www:/var/www/certbot" \
  certbot/certbot:latest \
  certonly --webroot -w /var/www/certbot \
  -d "$DOMINIO" -d "www.$DOMINIO" \
  --email "$EMAIL" --agree-tos --no-eff-email

# So agora, com o certificado em disco, o nginx consegue subir em modo TLS.
docker compose -f compose.yml -f compose.tls.yml up -d
echo "Certificado emitido. Stack no ar em https://$DOMINIO"
