#!/usr/bin/env bash
# =========================================================
# Deploy CallWe na VPS — build local + rolling restart.
# Pode ser chamado manualmente:
#   bash /opt/callwe/infra/scripts/deploy.sh [api|web|worker|all]
# Ou via GitHub Actions SSH (push em main).
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

build_image() {
  local name="$1"
  local dockerfile="$2"
  shift 2
  echo "→ Build $name..."
  docker build -f "$INFRA_DIR/docker/${dockerfile}" -t "callwe-$name" "$@" "$APP_DIR"
}

# Sobe/recria os serviços. `up -d` (sem --force-recreate e sem rm) recria sozinho
# os containers cuja imagem mudou e deixa os demais — sem corrida de remoção nem
# erro "No such container" do --force-recreate.
recreate() {
  $COMPOSE up -d --no-deps "$@"
}

case "$TARGET" in
  api)
    build_image api api.Dockerfile
    recreate api
    ;;
  web)
    build_image web web.Dockerfile \
      --build-arg "NEXT_PUBLIC_API_URL=https://api.callwe.digital" \
      --build-arg "NEXT_PUBLIC_CLOUDTALK_PARTNER_ID="
    recreate web
    ;;
  worker)
    build_image worker worker.Dockerfile
    recreate worker
    ;;
  all)
    build_image api api.Dockerfile
    build_image worker worker.Dockerfile
    build_image web web.Dockerfile \
      --build-arg "NEXT_PUBLIC_API_URL=https://api.callwe.digital" \
      --build-arg "NEXT_PUBLIC_CLOUDTALK_PARTNER_ID="
    recreate api worker web
    ;;
  *)
    echo "Uso: $0 [api|web|worker|all]"
    exit 1
    ;;
esac

echo "→ Limpando dangling images..."
docker image prune -f >/dev/null 2>&1 || true

echo "→ Reload nginx (DNS cache dos containers recriados)..."
$COMPOSE restart nginx

echo "→ Status:"
$COMPOSE ps

echo "✅ Deploy concluído ($TARGET) em $(date -u +%FT%TZ)"
