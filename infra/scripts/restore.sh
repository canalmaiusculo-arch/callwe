#!/usr/bin/env bash
# Uso: bash infra/scripts/restore.sh s3://bucket/backups/callwe-20260414T020000Z.sql.gz
set -euo pipefail

SRC="${1:?arg: s3://bucket/key.sql.gz ou caminho local}"
cd "$(dirname "$0")/.."

LOCAL="/tmp/restore-$(date +%s).sql.gz"

if [[ "$SRC" == s3://* ]]; then
  aws --endpoint-url "${S3_ENDPOINT}" s3 cp "$SRC" "$LOCAL"
else
  cp "$SRC" "$LOCAL"
fi

echo "⚠️  ATENÇÃO: isso vai DERRUBAR o banco atual."
read -rp "Digite 'RESTORE' para confirmar: " confirm
[[ "$confirm" == "RESTORE" ]] || { echo "abortado"; exit 1; }

echo "→ Restaurando..."
gunzip -c "$LOCAL" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

rm -f "$LOCAL"
echo "✅ Restore concluído"
