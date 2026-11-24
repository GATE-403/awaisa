#!/bin/sh
# Rolls the server out to images already built by CI (.github/workflows/deploy.yml), no build here.
#   sh scripts/deploy.sh <tag>      run from the folder with docker-compose.yml and .env
# A GHCR token on stdin logs in to pull private images (the workflow passes its own); with nothing
# on stdin the images must be public or already logged in. The tag lands in .image-tag, so by hand:
#   IMAGE_TAG=$(cat .image-tag) API_IMAGE=… WEB_IMAGE=… docker compose --profile app ps
# Migrations run first (the `migrate` service); api and worker start only when they succeed.
set -eu

TAG="${1:?usage: scripts/deploy.sh <tag>}"
PREFIX="${IMAGE_PREFIX:-ghcr.io/glassmakers/awaisa}"

export IMAGE_TAG="$TAG"
export API_IMAGE="$PREFIX-api"
export WEB_IMAGE="$PREFIX-web"
# Errors in Sentry name the commit that served them.
export SENTRY_RELEASE="${SENTRY_RELEASE:-$TAG}"

if [ ! -t 0 ]; then
  TOKEN="$(cat)"
  if [ -n "$TOKEN" ]; then
    printf '%s' "$TOKEN" | docker login ghcr.io -u "${GHCR_USER:-deploy}" --password-stdin >/dev/null
    trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
  fi
fi

compose() { docker compose --profile app "$@"; }

echo "deploy: pulling $TAG"
compose pull migrate api worker web

echo "deploy: starting"
compose up -d --no-build --remove-orphans

echo "deploy: waiting for the API"
attempt=0
until compose exec -T api wget -qO- http://127.0.0.1:4000/health >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "deploy: the API did not answer /health" >&2
    compose ps
    compose logs --tail 50 migrate api
    exit 1
  fi
  sleep 3
done

printf '%s\n' "$TAG" > .image-tag
docker image prune -f >/dev/null
echo "deploy: $TAG is live"
