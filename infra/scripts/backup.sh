#!/usr/bin/env bash
# =========================================================
# Backup diário do Postgres → R2.
# Rodar via cron:
#   crontab -e
#   0 2 * * * cd /opt/callwe && set -a && source infra/.env && set +a && bash infra/scripts/backup.sh >> /var/log/callwe-backup.log 2>&1
# =========================================================
set -euo pipefail

: "${S3_BUCKET:?S3_BUCKET não setado}"
: "${S3_ENDPOINT:?S3_ENDPOINT não setado}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID não setado}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY não setado}"
: "${POSTGRES_USER:?POSTGRES_USER não setado}"
: "${POSTGRES_DB:?POSTGRES_DB não setado}"

# AWS CLI usa essas variáveis padrão
export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
TMPFILE="/tmp/callwe-${STAMP}.sql.gz"
RETENTION_DAYS=30

cd /opt/callwe/infra

echo "→ [$(date -u +%FT%TZ)] pg_dump → $TMPFILE"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl \
  | gzip -9 > "${TMPFILE}"

SIZE=$(du -h "$TMPFILE" | cut -f1)
echo "→ Dump tamanho: $SIZE"

echo "→ Upload → s3://${S3_BUCKET}/backups/callwe-${STAMP}.sql.gz"
aws --endpoint-url "${S3_ENDPOINT}" s3 cp "${TMPFILE}" "s3://${S3_BUCKET}/backups/callwe-${STAMP}.sql.gz" --quiet

echo "→ Removendo arquivo local"
rm -f "${TMPFILE}"

echo "→ Purgando backups > ${RETENTION_DAYS} dias"
CUTOFF_EPOCH=$(( $(date +%s) - RETENTION_DAYS * 86400 ))
aws --endpoint-url "${S3_ENDPOINT}" s3api list-objects-v2 \
  --bucket "${S3_BUCKET}" \
  --prefix "backups/" \
  --query 'Contents[].{Key:Key,LastModified:LastModified}' \
  --output json 2>/dev/null | \
  python3 -c "
import json, sys, datetime
data = json.load(sys.stdin) or []
cutoff = datetime.datetime.utcfromtimestamp($CUTOFF_EPOCH).replace(tzinfo=datetime.timezone.utc)
for item in data:
    if item is None: continue
    last = datetime.datetime.fromisoformat(item['LastModified'].replace('Z', '+00:00'))
    if last < cutoff:
        print(item['Key'])
" | while read -r key; do
  [ -z "$key" ] && continue
  echo "   deletando $key"
  aws --endpoint-url "${S3_ENDPOINT}" s3 rm "s3://${S3_BUCKET}/${key}" --quiet
done

echo "✅ Backup ${STAMP} concluído"
