# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@^2 prune web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
# Next inlines NEXT_PUBLIC_* into the bundle at build time: set them here, not on the container.
ARG NEXT_PUBLIC_SITE_URL=https://awaisa.kg
ARG NEXT_PUBLIC_MAP_TILES_URL=
ARG NEXT_PUBLIC_MAP_TILES_URL_DARK=
ARG NEXT_PUBLIC_MAP_ATTRIBUTION=
ARG NEXT_PUBLIC_MAP_ATTRIBUTION_DARK=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MAP_TILES_URL=$NEXT_PUBLIC_MAP_TILES_URL \
    NEXT_PUBLIC_MAP_TILES_URL_DARK=$NEXT_PUBLIC_MAP_TILES_URL_DARK \
    NEXT_PUBLIC_MAP_ATTRIBUTION=$NEXT_PUBLIC_MAP_ATTRIBUTION \
    NEXT_PUBLIC_MAP_ATTRIBUTION_DARK=$NEXT_PUBLIC_MAP_ATTRIBUTION_DARK
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
