#!/usr/bin/env bash
# The load-test stand, apart from the dev servers and their data: a database `awaisa_load` with
# fresh demo data, Redis db 6, the API built for production on :4400 (PROCESS_ROLE=api) and, with
# `up web`, the web built for production on :3400. Needs `pnpm db:up` (Postgres and Redis).
#   ./stand.sh up [web]   ./stand.sh down
# API_CACHE=off ./stand.sh up measures the database path with no cache.
set -euo pipefail
cd "$(dirname "$0")"
API_DIR=$(cd .. && pwd)
WEB_DIR=$(cd ../../web && pwd)
STATE=${TMPDIR:-/tmp}/awaisa-load
DB=postgres://awaisa:awaisa@localhost:5432/awaisa_load
psql() { docker exec awaisa-postgres-1 psql -U awaisa "$@"; }

stop() {
  for pid in "$STATE"/*.pid; do [ -f "$pid" ] && kill "$(cat "$pid")" 2>/dev/null || true; done
  for port in 3400 4400; do lsof -nP -iTCP:$port -sTCP:LISTEN -t | xargs kill 2>/dev/null || true; done
  rm -f "$STATE"/*.pid
}

if [ "${1:-}" = down ]; then
  stop
  psql -d postgres -qc 'DROP DATABASE IF EXISTS awaisa_load'
  docker exec awaisa-redis-1 redis-cli -n 6 FLUSHDB >/dev/null
  echo 'Stand down.'
  exit 0
fi

mkdir -p "$STATE"
stop
psql -d postgres -qc 'DROP DATABASE IF EXISTS awaisa_load' -c 'CREATE DATABASE awaisa_load' 2>/dev/null
docker exec awaisa-redis-1 redis-cli -n 6 FLUSHDB >/dev/null
(cd "$API_DIR" && rm -rf dist-e2e && pnpm exec tsc -p tsconfig.build.json --outDir dist-e2e --incremental false)
DATABASE_URL=$DB node "$API_DIR/dist-e2e/database/migrate.js" >/dev/null
DATABASE_URL=$DB pnpm --dir "$API_DIR" seed:demo | tail -1

# Every request comes from this machine: per-IP limits would cut the test short.
# exec: the subshell becomes the server, whose output goes to the log, so nothing holds this
# script's output open (a `| tail` would otherwise wait for the server forever).
(cd "$API_DIR" && exec env NODE_ENV=production PROCESS_ROLE=api API_PORT=4400 DATABASE_URL=$DB \
  REDIS_URL=redis://localhost:6379/6 API_CACHE="${API_CACHE:-}" AUTH_SECRET="$(openssl rand -hex 32)" \
  WEB_ORIGIN=http://localhost:3400 PUBLIC_WEB_URL=http://localhost:3400 SMS_DRIVER=console \
  RATE_LIMIT_PER_MINUTE=1000000 BOOKING_RATE_LIMIT_PER_MINUTE=1000000 AUTH_RATE_LIMIT_PER_MINUTE=1000000 \
  TELEGRAM_BOT_TOKEN= TELEGRAM_GATEWAY_TOKEN= SENTRY_DSN= \
  node dist-e2e/main.js </dev/null >"$STATE/api.log" 2>&1) &
echo $! >"$STATE/api.pid"
for _ in $(seq 1 30); do curl -sf localhost:4400/health >/dev/null && break; sleep 1; done
echo "API on :4400 — $(curl -s localhost:4400/health)"

if [ "${2:-}" = web ]; then
  (cd "$WEB_DIR" && API_URL=http://localhost:4400 NEXT_DIST_DIR=.next-e2e TZ=UTC pnpm exec next build >"$STATE/web-build.log" 2>&1)
  (cd "$WEB_DIR" && API_URL=http://localhost:4400 NEXT_DIST_DIR=.next-e2e TZ=UTC \
    exec pnpm exec next start -p 3400 </dev/null >"$STATE/web.log" 2>&1) &
  echo $! >"$STATE/web.pid"
  for _ in $(seq 1 30); do curl -sf -o /dev/null localhost:3400 && break; sleep 1; done
  echo 'Web on :3400'
fi
echo "Logs in $STATE"
