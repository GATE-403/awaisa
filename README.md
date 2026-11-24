<p align="center">
  <img src="apps/web/src/app/icon.svg" width="96" height="96" alt="Awaisa">
</p>

<h1 align="center">Awaisa</h1>

<p align="center">Book beauty and wellness masters in Bishkek. No phone calls.</p>

Awaisa is an online booking platform. Any business (a barbershop, a hair or nail salon, a spa, a dental clinic) signs up and gets its own page at `/<slug>`. Clients find places and services in the catalog, pick a master and a time and book themselves; the confirmation and reminders come by SMS, WhatsApp or Telegram. Owners get a cabinet: the day's schedule, clients, analytics, the cash desk, promotions and loyalty, and the public page edited in place. Masters get «Мой день», their own day on the phone.

The interface is in Russian, with Kyrgyz and English translations.

## Stack

- **Monorepo:** Turborepo and pnpm workspaces, Biome for lint and format.
- **Web:** Next.js 16 (App Router, Cache Components, Partial Prerendering, React Compiler), CSS Modules on design tokens, an in-house UI kit on Base UI.
- **API:** NestJS (ESM), TypeORM, PostgreSQL, Redis for the cache and rate limits.
- **Mobile:** Expo shell that renders the web app in a WebView, with native pushes, haptics and keyboard handling.
- **Tests:** Vitest unit tests, Playwright e2e with axe, k6 load tests.

## Monorepo

| Package | What is inside |
| --- | --- |
| `apps/web` | Next.js app: catalog, business pages, booking, client profile, owner cabinet |
| `apps/api` | NestJS + TypeORM + PostgreSQL API, Redis cache, cron jobs |
| `apps/mobile` | Expo shell that shows `apps/web` in a WebView |
| `packages/tokens` | design tokens (colors, spacing, typography) as TS and CSS variables |
| `packages/ui` | UI kit on Base UI and CSS Modules |
| `packages/contracts` | API request and response types shared by web and api |
| `recsys_eval` | offline evaluation of the «Для вас» recommendations (never part of the app) |
| `tests/ux` | UX and accessibility kit |

## Quick start

Requirements: Node.js, pnpm and Docker.

```bash
cp .env.example .env
pnpm install
pnpm db:up      # PostgreSQL and Redis in Docker
pnpm db:seed    # demo data, development only
pnpm dev        # web :3000, api :4000 (/health), Expo
```

`pnpm dev` also starts Expo (`apps/mobile`): press `i` / `a` in its panel or scan the QR code in Expo Go. Sign-in codes are printed to the API log in development. The UI kit demo is at http://localhost:3000/ui.

The whole stack in Docker: `docker compose --profile app up --build`.

## Tests and checks

```bash
pnpm lint         # Biome
pnpm typecheck
pnpm test         # unit tests
pnpm test:e2e     # Playwright, needs pnpm db:up
pnpm test:a11y    # accessibility checks
pnpm test:ux      # the whole UX kit
pnpm --filter api test:db   # cron SQL on a real Postgres
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and the build on every pull request, and the e2e suite in five shards.

## Documentation

- [AGENTS.md](AGENTS.md): architecture, design system, API, conventions and tests (start here).
- [docs/launch.md](docs/launch.md): the launch checklist.
- [docs/architecture-review.md](docs/architecture-review.md): architecture audit and follow-ups.
- [docs/design](docs/design): design principles and approved patterns.
- `apps/web/AGENTS.md`, `apps/api/AGENTS.md`, `apps/mobile/AGENTS.md`: notes per app.
