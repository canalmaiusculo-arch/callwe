#!/usr/bin/env bash
# =========================================================
# Deploy CallWe COM limpeza de cache Docker.
# Use quando o deploy normal não está pegando mudanças no código.
# Uso: bash infra/scripts/deploy-clean.sh [api|web|worker|all]
# =========================================================
set -euo pipefail

TARGET="${1:-all}"
APP_DIR="/opt/callwe"
INFRA_DIR="$APP_DIR/infra"
COMPOSE="docker compose -f $INFRA_DIR/docker-compose.prod.yml"

cd "$APP_DIR"

echo "→ [$(date -u +%FT%TZ)] Atualizando código..."
git fetch --all --quiet
git reset --hard origin/main

echo "→ Garantindo imagens locais no compose..."
sed -i 's|image: ghcr.io/.*callwe-migrate.*|image: callwe-migrate|' "$INFRA_DIR/docker-compose.prod.yml"
sed -i 's|image: ghcr.io/.*callwe-api.*|image: callwe-api|' "$INFRA_DIR/docker-compose.prod.yml"
sed -i 's|image: ghcr.io/.*callwe-worker.*|image: callwe-worker|' "$INFRA_DIR/docker-compose.prod.yml"
sed -i 's|image: ghcr.io/.*callwe-web.*|image: callwe-web|' "$INFRA_DIR/docker-compose.prod.yml"

echo "→ Limpando cache de build do Docker..."
docker builder prune -af >/dev/null 2>&1 || true

build_clean() {
  local name="$1"
  local dockerfile="$2"
  shift 2
  echo "→ Build LIMPO de $name..."
  docker rmi "callwe-$name" 2>/dev/null || true
  docker build --no-cache --pull -f "$INFRA_DIR/docker/${dockerfile}" -t "callwe-$name" "$@" "$APP_DIR"
}

case "$TARGET" in
  api)
    build_clean api api.Dockerfile
    $COMPOSE up -d --no-deps --force-recreate api
    ;;
  web)
    build_clean web web.Dockerfile \
      --build-arg "NEXT_PUBLIC_API_URL=https://api.callwe.digital" \
      --build-arg "NEXT_PUBLIC_CLOUDTALK_PARTNER_ID="
    $COMPOSE up -d --no-deps --force-recreate web
    ;;
  worker)
    build_clean worker worker.Dockerfile
    $COMPOSE up -d --no-deps --force-recreate worker
    ;;
  all)
    build_clean api api.Dockerfile
    build_clean worker worker.Dockerfile
    build_clean web web.Dockerfile \
      --build-arg "NEXT_PUBLIC_API_URL=https://api.callwe.digital" \
      --build-arg "NEXT_PUBLIC_CLOUDTALK_PARTNER_ID="
    $COMPOSE up -d --no-deps --force-recreate api worker web
    ;;
  *)
    echo "Uso: $0 [api|web|worker|all]"
    exit 1
    ;;
esac

echo "→ Reload nginx (DNS cache)..."
$COMPOSE restart nginx

echo "→ Aguardando api ficar healthy..."
sleep 15

echo "→ Status:"
$COMPOSE ps

echo ""
echo "→ Rotas registradas pela API:"
$COMPOSE logs api --tail 100 2>/dev/null | grep -i "RoutesResolver" || true

echo ""
echo "✅ Deploy LIMPO ($TARGET) concluído em $(date -u +%FT%TZ)"
