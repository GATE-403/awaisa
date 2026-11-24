#!/bin/sh
# Restores one copy made by db-backup.sh into a database of its own, never over the live one:
#   docker compose --profile app run --rm --entrypoint sh backup /scripts/db-restore.sh \
#     /backups/awaisa-2026-11-24T030000Z.dump awaisa_restore
# Then point a test API at the new database and open the site on it: a copy that was never
# restored does not count as a backup.
set -eu

FILE="${1:?usage: db-restore.sh <file.dump> <new database>}"
TARGET="${2:?usage: db-restore.sh <file.dump> <new database>}"

if [ "$TARGET" = "$PGDATABASE" ]; then
  echo "restore: refusing to restore over the live database «$PGDATABASE»" >&2
  exit 1
fi

until pg_isready --quiet; do sleep 2; done
createdb "$TARGET"
pg_restore --no-owner --exit-on-error --dbname="$TARGET" "$FILE"
echo "restore: $FILE into $TARGET"
psql --dbname="$TARGET" --no-psqlrc \
  --command="SELECT (SELECT count(*) FROM businesses) AS businesses, (SELECT count(*) FROM bookings) AS bookings"
