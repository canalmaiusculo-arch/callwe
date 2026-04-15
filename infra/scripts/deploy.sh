#!/usr/bin/env bash
# =========================================================
# Deploy CallWe na VPS (Rota A).
# Executa do diretório de infra em produção, com .env configurado.
# Rodar via GitHub Actions (SSH) ou manualmente:
#   bash infra/scripts/deploy.sh <image_tag>
# =========================================================
set -euo pipefail

IMAGE_TAG="${1:-latest}"
export IMAGE_TAG

cd "$(dirname "$0")/.."

echo "→ Puxando imagens ${IMAGE_TAG}..."
docker compose -f docker-compose.prod.yml pull

echo "→ Rodando migration..."
docker compose -f docker-compose.prod.yml run --rm migrate

echo "→ Rolling restart (api, worker, web)..."
docker compose -f docker-compose.prod.yml up -d --no-deps --remove-orphans api worker web

echo "→ Reload nginx..."
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload || docker compose -f docker-compose.prod.yml up -d nginx

echo "→ Limpando imagens antigas..."
docker image prune -f

echo "✅ Deploy concluído (${IMAGE_TAG})"
