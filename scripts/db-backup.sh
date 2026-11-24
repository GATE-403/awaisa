#!/bin/sh
# Nightly database copies for the `backup` service in docker-compose.yml: one `pg_dump` in
# Postgres's custom format at start and then every BACKUP_EVERY_HOURS, the last BACKUP_KEEP_DAYS
# kept in /backups. Connection from the usual PG* variables (PGHOST, PGUSER, PGPASSWORD,
# PGDATABASE). A copy on the same disk does not survive the server: sync /backups elsewhere too
# (docs/launch.md, «Резервные копии»).
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
EVERY_HOURS="${BACKUP_EVERY_HOURS:-24}"
DIR="${BACKUP_DIR:-/backups}"

dump() {
  name="${PGDATABASE}-$(date -u +%Y-%m-%dT%H%M%SZ).dump"
  # Written under a temporary name first: a dump cut short never looks like a good one.
  if pg_dump --format=custom --no-owner --file="$DIR/$name.partial"; then
    mv "$DIR/$name.partial" "$DIR/$name"
    echo "backup: $name ($(du -h "$DIR/$name" | cut -f1))"
  else
    rm -f "$DIR/$name.partial"
    echo "backup: pg_dump failed" >&2
  fi
  find "$DIR" -name '*.dump' -mtime +"$KEEP_DAYS" -delete
}

mkdir -p "$DIR"
until pg_isready --quiet; do sleep 2; done

if [ "${1:-}" = "--once" ]; then
  dump
  exit 0
fi

while true; do
  dump
  sleep $((EVERY_HOURS * 3600))
done
