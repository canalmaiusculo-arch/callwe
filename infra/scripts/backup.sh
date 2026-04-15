#!/usr/bin/env bash
# Backup diário do Postgres → R2/S3. Adicionar ao cron:
#   0 2 * * * /home/ubuntu/callwe/infra/scripts/backup.sh >> /var/log/callwe-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

: "${S3_BUCKET:?}"
: "${S3_ENDPOINT:?}"
: "${AWS_ACCESS_KEY_ID:?}"
: "${AWS_SECRET_ACCESS_KEY:?}"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="/tmp/callwe-${STAMP}.sql.gz"

echo "→ pg_dump ${STAMP}"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists \
  | gzip -9 > "${FILE}"

echo "→ Upload → s3://${S3_BUCKET}/backups/${STAMP}.sql.gz"
aws --endpoint-url "${S3_ENDPOINT}" s3 cp "${FILE}" "s3://${S3_BUCKET}/backups/$(basename ${FILE})"

echo "→ Removendo arquivo local"
rm -f "${FILE}"

echo "→ Purgando backups > 30 dias"
aws --endpoint-url "${S3_ENDPOINT}" s3 ls "s3://${S3_BUCKET}/backups/" \
  | awk '{print $4}' \
  | while read -r key; do
      [ -z "$key" ] && continue
      age_days=$(( ( $(date +%s) - $(date -d "$(echo "$key" | sed -E 's/callwe-([0-9]{8})T.*/\1/;s/([0-9]{4})([0-9]{2})([0-9]{2})/\1-\2-\3/')" +%s) ) / 86400 ))
      if [ "$age_days" -gt 30 ]; then
        echo "   deletando $key (${age_days}d)"
        aws --endpoint-url "${S3_ENDPOINT}" s3 rm "s3://${S3_BUCKET}/backups/$key"
      fi
    done

echo "✅ Backup ${STAMP} concluído"
