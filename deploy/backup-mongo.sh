#!/usr/bin/env bash
# Dump do MongoDB local (profile db) em deploy/backups/, mantendo 7 dias.
# Agendar no cron do usuário, ex.: 30 3 * * * /opt/medicano/deploy/backup-mongo.sh
# Para cópia fora da máquina, mande deploy/backups/ para o restic/rest-server.
set -euo pipefail
cd "$(dirname "$0")"

file="medicano-$(date +%F-%H%M).archive.gz"
docker compose exec -T mongo sh -c \
  'mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive=/backups/'"$file"' --gzip'

find backups -name 'medicano-*.archive.gz' -mtime +7 -delete
echo "backup ok: backups/$file"
