#!/usr/bin/env bash
#
# Emissao do certificado Let's Encrypt para cursaas.bktec.dev.br (canonico) e
# para bktec.dev.br / www.bktec.dev.br, que redirecionam para ele.
#
# Rode UMA vez, no servidor, depois que o registro A do dominio ja apontar para
# este host. A renovacao seguinte e automatica: o servico `certbot` do
# compose.tls.yml roda `certbot renew` a cada 12h.
#
#   cd /opt/cursaas && ./scripts/emitir-certificado.sh seu-email@dominio.com
#
# Rode este script ANTES de fazer o deploy que troca o nginx para o subdominio.
# Rodar depois nao quebra nada (o apex continua no certificado, e o site segue
# no ar), mas cursaas.bktec.dev.br responde com aviso de nome invalido ate a
# emissao acontecer.
set -euo pipefail

# LINHAGEM e o diretorio em /etc/letsencrypt/live/ e precisa bater com o
# ssl_certificate de docker/nginx/default.tls.conf. Segue "bktec.dev.br" porque
# e a linhagem que ja existe em producao: com --cert-name o certbot EXPANDE ela
# para incluir o subdominio, em vez de criar um diretorio novo que o nginx
# ainda nao conhece. Trocar o nome aqui exige trocar as duas linhas do nginx.
LINHAGEM="bktec.dev.br"
DOMINIO="cursaas.bktec.dev.br"
DOMINIOS_REDIRECT=("bktec.dev.br" "www.bktec.dev.br")
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
for nome in "$DOMINIO" "${DOMINIOS_REDIRECT[@]}"; do
  resolvido=$(getent ahostsv4 "$nome" | awk 'NR==1{print $1}' || true)
  echo "  $nome -> ${resolvido:-<nao resolve>}"
  if [ "$resolvido" != "$IP_ESPERADO" ]; then
    echo "ABORTADO: $nome nao aponta para este servidor." >&2
    echo "Corrija o registro A no Registro.br e espere propagar." >&2
    exit 1
  fi
done

PROJETO=$(basename "$PWD")

# Ha dois cenarios, e eles pedem nginx diferente no ar durante o desafio.
#
# 1. PRIMEIRA emissao: nao existe certificado em disco, entao o overlay de TLS
#    nao pode subir — default.tls.conf declara ssl_certificate apontando para um
#    arquivo inexistente e o nginx se recusa a iniciar. Sem nginx, nada serve o
#    desafio e a emissao falha: os dois lados travam um ao outro. Por isso sobe
#    o compose BASE, em HTTP puro, que monta o mesmo volume certbot_www e serve
#    /.well-known/acme-challenge/ a partir dele.
#
# 2. EXPANSAO (o caso da mudanca para o subdominio): ja existe certificado e a
#    stack esta no ar com TLS. Aqui derrubar para o compose base tiraria o site
#    do HTTPS durante a emissao, sem necessidade — a config de TLS ja serve o
#    acme-challenge na :80, antes do redirect. Entao nao se mexe no nginx.
if docker run --rm -v "${PROJETO}_certbot_conf:/etc/letsencrypt" \
     certbot/certbot:latest certificates --cert-name "$LINHAGEM" 2>/dev/null \
     | grep -q "Certificate Name: $LINHAGEM"; then
  echo "Linhagem '$LINHAGEM' ja existe — expandindo, sem tocar no nginx."
else
  echo "Primeira emissao — subindo o nginx em HTTP puro para servir o desafio."
  docker compose up -d nginx
fi

# `docker run` e nao `docker compose run`: o servico certbot so existe no
# overlay de TLS, que pode nao estar carregado neste ponto. Os volumes ja
# foram criados pelo compose base (prefixo do projeto = nome do diretorio).
#
# --cert-name fixa o diretorio em /etc/letsencrypt/live/, que e o caminho
# compilado no default.tls.conf. Sem ele o certbot nomearia a linhagem pelo
# primeiro -d (cursaas.bktec.dev.br) e o nginx apontaria para o lugar errado.
# --expand autoriza acrescentar nomes a uma linhagem existente.
docker run --rm \
  -v "${PROJETO}_certbot_conf:/etc/letsencrypt" \
  -v "${PROJETO}_certbot_www:/var/www/certbot" \
  certbot/certbot:latest \
  certonly --webroot -w /var/www/certbot \
  --cert-name "$LINHAGEM" --expand \
  -d "$DOMINIO" $(printf -- '-d %s ' "${DOMINIOS_REDIRECT[@]}") \
  --email "$EMAIL" --agree-tos --no-eff-email

# So agora, com o certificado em disco, o nginx consegue subir em modo TLS.
docker compose -f compose.yml -f compose.tls.yml up -d

# Recarrega para o caso de o nginx ja estar no ar: `up -d` nao recria um
# container cuja config nao mudou, e o certificado renovado so entra em uso
# depois do reload.
docker compose -f compose.yml -f compose.tls.yml exec -T nginx nginx -s reload \
  >/dev/null 2>&1 || true

echo "Certificado emitido. Stack no ar em https://$DOMINIO"
