# AGENTS.md

Turborepo monorepo, pnpm workspaces.

- `apps/web` — Next.js (App Router, `src/`, Cache Components, React Compiler). Read `apps/web/AGENTS.md` before editing it.
- `apps/api` — NestJS (ESM) + TypeORM + PostgreSQL. Read `apps/api/AGENTS.md` before editing it.
- `apps/mobile` — Expo (SDK 58) shell that renders `apps/web` in a WebView. Read `apps/mobile/AGENTS.md` before editing it.
- `packages/tokens` — design tokens (colors light/dark, spacing, radius, typography, durations) as TS. `build` generates `dist/tokens.css` (CSS variables). Used by web (CSS) and mobile (JS).
- `packages/ui` — in-house UI kit for web: Base UI (`@base-ui/react`) primitives styled with CSS Modules on token variables, shadcn-style (source lives here, not on npm).

## UI kit

- Import per component: `import { Button } from '@awaisa/ui/Button'`. Global styles: `@awaisa/ui/styles.css` + `@awaisa/tokens/tokens.css` (imported in `apps/web/src/app/layout.tsx`).
- New component: `packages/ui/src/components/<Name>/{<Name>.tsx, <Name>.module.css, index.ts}`. Wrap the Base UI part, merge `className` with `mergeClassName`, expose variants as `data-*` attributes and style them in CSS.
- Style states via Base UI data attributes (`data-checked`, `data-open`, `data-disabled`, `data-invalid`, `data-starting-style`/`data-ending-style` for animations). Docs: https://base-ui.com/react/overview/quick-start
- Only CSS variables from tokens — no hard-coded colors/sizes. Theme: system by default, force with `<html data-theme='light' | 'dark'>`.
- Base UI is DOM-only, so `packages/ui` does not work in React Native. For native screens, add `packages/ui-native` with the same component API on RN primitives and the same tokens.
- Demo of all components: `/ui` in the web app.
- Components: Button (primary/secondary/outline/ghost/danger/link × sm/md/lg), Link (renders Next `<Link>` via `render`), Input, Field, Select, Checkbox (incl. indeterminate), Switch, Radio + RadioGroup, RadioCard, Tabs, Dialog, Skeleton. The set follows the Figma file `Awaisa` (Components section); colors, typography and sizes come from tokens, not from Figma.

## Design tokens

- Palette: `blue` (brand, primary = blue-600) and `neutral` scales, plus `red`/`green`. Components use only semantic colors (`--color-primary`, `--color-subtle`, `--color-border-strong`, …), never palette values.
- Spacing on a 4px grid (`--space-1` = 4px … `--space-20` = 80px). Radius `xs 4 / sm 6 / md 8 / lg 12 / xl 16 / 2xl 24 / full`.
- Type scale with paired line heights: `--text-sm` + `--text-sm-line-height` (xs 12/16 … 4xl 36/40). Weights 400/500/600/700. Web font: Inter (cyrillic) via `next/font`.
- Control heights `--control-height-sm|md|lg` = 32/40/48. Focus: `box-shadow: var(--focus-ring)`.
- Breakpoints (JS only, use literal px in media queries): sm 640, md 768, lg 1024, xl 1280.

## Web app structure

The web app is an online-booking site for one company, backed by the NestJS API.

- Routes: `/` home, `/services` catalog, `/book` booking flow (`?service=` / `?specialist=` preselect), `/bookings` client's bookings, `/ui` kit demo.
- `src/app/` — routes only, thin files that render a feature page. Default exports only here.
- `src/features/<feature>/` — feature pages, their components, hooks and constants (`home`, `services`, `booking`, `bookings`). Not `src/pages/`: that name is reserved by Next.js for the Pages Router.
- `src/common/components/` — shared app components (`Header`, `TabBar`, `Footer`, `Container`, `Section`, `Shelf`, cards). `src/constants/` — app-wide constants (`company.ts`, `navigation.ts`).
- Data: the catalog comes from the API via `common/api/serverApi.ts` (`getCatalog`, deduped per request with `cache`) inside `<Suspense>` — the page shell stays prerendered, data streams at request time. Browser calls go through `common/api/clientApi.ts` to `/api/*`, which `next.config.ts` rewrites to `API_URL` (same origin: no CORS, works in the mobile WebView).
- Client bookings: `localStorage` keeps `{ id, token, snapshot }` per booking (`common/utils/bookingStorage.ts`); the token is the only way to view/cancel without accounts. `/bookings` refreshes snapshots from the API.
- API types are mirrored in `common/api/types.ts` — keep them in sync with the API responses.

## App shell and responsive rules

- Layout variables live in `src/common/styles/shell.css`: `--header-height` (56/64), `--tabbar-height` (60 on phones, 0 from 768px), `--page-gutter` (16/24/32), `--section-gap`.
- Header is sticky and translucent (blur); it gets a hairline once the page scrolls. Primary nav is in the header from 768px and in the bottom `TabBar` on phones.
- `/book` hides the tab bar and shows its own fixed action bar (phones/tablets) or a sticky summary card (≥1024px). The action button always moves the client to the first unfinished step instead of being disabled.
- Completed booking steps collapse to one line with "Изменить". Anything fixed to the bottom pads for `env(safe-area-inset-bottom)`; the viewport uses `viewport-fit: cover`.
- Never read the current time during render on the server: use `useToday()` (server snapshot is `null`, the client fills it in).
- Horizontal lists use `Shelf` (scroll-snap on phones, grid from 1024px). Icons: `lucide-react`.

## Booking API (apps/api)

- `GET /catalog`, `GET /availability?serviceId&specialistId&date`, `POST /bookings`, `GET|DELETE /bookings/:id` with `x-booking-token`. `specialistId=any` picks the first free specialist.
- Business time zone is fixed UTC+6 (`src/common/business-time.ts`); working hours, slot step, lead time and booking horizon are in `src/bookings/booking-rules.ts`.
- Slots are computed by the pure `buildSlots` (`src/bookings/availability.ts`, unit-tested). Double booking is prevented by the Postgres exclusion constraint `bookings_no_overlap` (btree_gist); a violation returns 409 and the web re-fetches slots.
- Validation: Zod schemas in `*.schemas.ts` via `@Body({ schema })` / `@Query({ schema })` + global `StandardSchemaValidationPipe`. Rate limit: 120 req/min per IP, 5 bookings/min (`trust proxy` is on for private networks).
- Catalog data is seeded by the `SeedCatalog` migration; edit it via new migrations, not by hand.

## Mobile ↔ web bridge

- The WebView loads `EXPO_PUBLIC_WEB_URL` (in `apps/mobile/.env`), or in dev `http://<dev machine LAN IP>:3000`.
- Before the page loads, the shell sets `window.__NATIVE_APP__ = { platform, version }`.
- Web → native: `postToNative()` from `apps/web/src/common/utils/nativeBridge.ts`. Message types are mirrored in `apps/mobile/src/common/utils/nativeBridge.ts` — change both together.
- Links to other origins open in the system browser; Android back navigates the web history first.
- `allowedDevOrigins` in `apps/web/next.config.ts` lets the phone reach the Next dev server by LAN IP.

## Commands (run from repo root)

- `pnpm db:up` — start PostgreSQL in Docker
- `pnpm dev` — run both apps (web :3000, api :4000)
- `pnpm build`, `pnpm typecheck`, `pnpm test`
- `pnpm lint` / `pnpm lint:fix` — Biome for the whole repo
- `docker compose --profile app up --build` — full stack in Docker

## Code style

Follows https://react-typescript-style-guide.com/, enforced by Biome where possible:

- Single quotes (JS and JSX), no semicolons, trailing commas.
- Components are arrow functions with named exports: `export const ProfileHero = () => {}`. Default exports only where a framework requires them (Next.js `page`/`layout`, `*.config.ts`).
- `interface` for component props, `type` for everything else.
- Component order: hooks → variables → `useEffect` → handlers → `return`. Early returns over `else`.
- Folders: `common/components/<Name>/<Name>.tsx`, `common/hooks/useX.ts`, `common/utils/`, `constants/`, `config/` (external integrations only).
- Files: components PascalCase, everything else camelCase. The API keeps Nest naming (`*.module.ts`, `*.controller.ts`).
- Several exports from one file go in a single `export { ... }` at the bottom.
- No comments that restate code; comment only the "why" (workarounds, platform quirks).

## Conventions

- Lint/format: Biome only (root `biome.json`, per-app overrides in `apps/*/biome.json`). No ESLint/Prettier.
- API: Biome `useImportType` is off — Nest DI needs runtime imports for constructor-injected classes.
- API DB: entities are `*.entity.ts` (auto-loaded), `synchronize` is off. Schema changes go through migrations:
  `pnpm --filter api migration:generate` → `pnpm --filter api migration:run`. Migrations also run on API start.
- Env: `.env` at repo root (copy from `.env.example`), validated by `apps/api/src/config/env.ts`. Mobile reads `apps/mobile/.env` (`EXPO_PUBLIC_WEB_URL`).
