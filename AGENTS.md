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
- Components: Button (primary/secondary/outline/ghost/danger/link/contrast × sm/md/lg), ButtonLink (navigation styled as a button — use it instead of `Button render={<a>}`, which gets `role="button"`), Link (renders Next `<Link>` via `render`), Input, Field, Select, Checkbox (incl. indeterminate), Switch, Radio + RadioGroup, RadioCard, Tabs, Dialog, Skeleton. The set follows the Figma file `Awaisa` (Components section); colors, typography and sizes come from tokens, not from Figma.

## Design system (macOS / iOS principles)

The look follows Apple HIG and the restrained style of apple.com: depth through layers, not borders.

- Layers: page `--color-background` (grouped gray #F2F2F7 / black) → content cards `--color-surface` (white / #1C1C1E) with `--shadow-sm` → floating chrome in matte material `--color-material` + `backdrop-filter: var(--blur-material)` + 0.5px `--color-material-border`. Do not put borders around cards.
- Colors are Apple semantic colors: `foreground` (label), `muted-foreground` (secondaryLabel, slightly darker for AA), `tertiary-foreground`, `subtle` (system fill), `border` (separator, use 0.5px hairlines), system blue/green/red/orange as `primary`/`success`/`danger`/`rating`. Never use palette values in components.
- Type: SF Pro on Apple devices, Inter elsewhere (`--font-sans` / `--font-display` for headings). iOS Dynamic Type scale: xs 12, footnote 13, sm 15 (subheadline), md 17 (body), lg 20, xl 22, 2xl 28, 3xl 34 (large title), 4xl 48. Titles are bold with negative tracking (`--tracking-tight` / `--tracking-title`).
- Shapes: buttons, chips, tab bar and segmented controls are capsules (`--radius-full`); fields 12, cards 16–22, sheets 28. Touch targets ≥ 44px (`--control-height-md`).
- Patterns: Settings-style inset grouped lists (`RadioGroup variant=inset`, uppercase footnote section headers, hairline separators inset 16px, value/chevron on the right), checkmark instead of radio circles in lists, segmented `Tabs`, iOS green switches, floating material tab bar and action bar on phones.
- Icons: Phosphor (`@phosphor-icons/react/ssr`) for UI glyphs only (`regular`, `fill` for the active tab, `bold` for chevrons). No decorative icons or illustrations — the look is typographic.
- Look follows apple.com/store: page `#f5f5f7`, text `#1d1d1f`/`#6e6e73`, blue `#0071e3` for fills and `--color-link` `#0066cc` for blue text on gray (AA contrast). Two-tone headings: bold title + muted continuation (`PageTitle`, `StoreShelf`). White cards, radius 28, soft `--shadow-sm`, small uppercase eyebrow (`--color-highlight` for "new/hit").
- Restraint: flat buttons without glow, one primary action per screen, secondary actions as compact `secondary` buttons. No glass/blur effects except the standard material on header, tab bar and booking bar.
- Real-world metaphors: bookings are shown as an e-ticket (`common/components/Ticket`: tear-off calendar leaf, perforation with notches, stub with code + barcode, "Отменена" stamp). Feedback goes through iOS-style toasts (`useToast()` from `@awaisa/ui/Toast`, provider in the root layout): success/error/info.
- Material blur: only `backdrop-filter: var(--blur-material)` in source — Lightning CSS adds `-webkit-`. Writing both by hand makes the minifier drop the standard one.
- Motion: `--ease-standard`, `--ease-spring` for toggles/indicators; pressed state = `scale: 0.97`.
- Spacing on a 4px grid (`--space-1` = 4px … `--space-20` = 80px). Breakpoints (JS only, literal px in media queries): sm 640, md 768, lg 1024, xl 1280.

## Web app structure

The web app is an online-booking site for one company, backed by the NestJS API.

- Routes: `/` home, `/services` catalog, `/book` booking flow (`?service=` / `?specialist=` preselect), `/bookings` client's bookings, `/ui` kit demo.
- `src/app/` — routes only, thin files that render a feature page. Default exports only here.
- `src/features/<feature>/` — feature pages, their components, hooks and constants (`home`, `services`, `booking`, `bookings`). Not `src/pages/`: that name is reserved by Next.js for the Pages Router.
- `src/common/components/` — shared app components (`Header`, `TabBar`, `Footer`, `Container`, `PageTitle`, `StoreShelf`, `StoreCard`, `Ticket`). `src/constants/` — app-wide constants (`company.ts`, `navigation.ts`).
- Data: the catalog comes from the API via `common/api/serverApi.ts` (`getCatalog`, deduped per request with `cache`) inside `<Suspense>` — the page shell stays prerendered, data streams at request time. Browser calls go through `common/api/clientApi.ts` to `/api/*`, which `next.config.ts` rewrites to `API_URL` (same origin: no CORS, works in the mobile WebView).
- Client bookings: `localStorage` keeps `{ id, token, snapshot }` per booking (`common/utils/bookingStorage.ts`); the token is the only way to view/cancel without accounts. `/bookings` refreshes snapshots from the API.
- API types are mirrored in `common/api/types.ts` — keep them in sync with the API responses.

## App shell and responsive rules

- Layout variables live in `src/common/styles/shell.css`: `--header-height` (56/64), `--tabbar-height` (60 on phones, 0 from 768px), `--page-gutter` (16/24/32), `--section-gap`.
- Header is sticky and translucent (blur); it gets a hairline once the page scrolls. Primary nav is in the header from 768px and in the bottom `TabBar` on phones.
- `/book` hides the tab bar and shows its own fixed action bar (phones/tablets) or a sticky summary card (≥1024px). The action button always moves the client to the first unfinished step instead of being disabled.
- Completed booking steps collapse to one line with "Изменить". Anything fixed to the bottom pads for `env(safe-area-inset-bottom)`; the viewport uses `viewport-fit: cover`.
- Never read the current time during render on the server: use `useToday()` (server snapshot is `null`, the client fills it in).
- Home mirrors apple.com/store: `StoreHero` (large two-tone title + live "next free slot" aside with text links), `CategoryLinks` (scrolling row of text categories), then `StoreShelf` rows: Популярное, Мастера, Почему удобно, Как нас найти.
- `StoreShelf` is a full-bleed horizontal scroller whose first card aligns with the container edge; paddle buttons from 768px; the track is focusable for keyboard scrolling. Cards are `StoreCard` (eyebrow, title, description, footer, round "+" when it is a link).
- Live data on the client: `useNextSlot(serviceId)` (today/tomorrow first free slot), `getOpeningStatus()` (open now / opens at). Russian plurals: `pluralize(count, [one, few, many])`.

## Booking API (apps/api)

- `GET /catalog`, `GET /availability?serviceId&specialistId&date`, `POST /bookings`, `GET|DELETE /bookings/:id` with `x-booking-token`. `specialistId=any` picks the first free specialist.
- Business time zone is fixed UTC+6 (`src/common/business-time.ts`); working hours, slot step, lead time and booking horizon are in `src/bookings/booking-rules.ts`.
- Slots are computed by the pure `buildSlots` (`src/bookings/availability.ts`, unit-tested). Double booking is prevented by the Postgres exclusion constraint `bookings_no_overlap` (btree_gist); a violation returns 409 and the web re-fetches slots.
- Validation: Zod schemas in `*.schemas.ts` via `@Body({ schema })` / `@Query({ schema })` + global `StandardSchemaValidationPipe`. Rate limit per IP: `RATE_LIMIT_PER_MINUTE` (120) and `BOOKING_RATE_LIMIT_PER_MINUTE` (5) for `POST /bookings`; `GET /catalog` is not limited because the web server fetches it for every visitor from one IP (`trust proxy` is on for private networks).
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
- `pnpm test:e2e` — Playwright suite in `apps/web/e2e` (needs `pnpm db:up`; see below)
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

## E2E, UX and cognitive-load tests

`apps/web/e2e` (Playwright + axe, projects `mobile` = Pixel 7 and `desktop` = 1440×900). The config starts its own API on :4210 (raised rate limits) and web on :3210, so dev servers on 3000/4000 are untouched. First run: `pnpm --filter web exec playwright install chromium`.

- `booking-flow.spec.ts` — real user journeys against the API: home → next slot → book, full booking → ticket → cancel (with confirmation), master and catalog deep links. Bookings it creates are cancelled afterwards (customer name `E2E Тест`).
- `ux.spec.ts` — the main action is never disabled and jumps to the first unfinished step, stays on screen on phones, no validation before the first submit, inline errors keep input, 409 conflict and slot-loading failures recover, collapsed steps reopen, success screen offers next steps, no horizontal scroll at 320–1024px, tap targets ≥ 44px, keyboard-only booking. API errors are mocked with `page.route`.
- `cognitive-load.spec.ts` — budgets: ≤ 4 steps with ≤ 3-word titles, ≤ 9 options per decision, ≤ 20 words before the first choice, ≤ 2 required fields, happy path ≤ 7 actions, price/duration visible before committing, ≤ 1 primary button on screen, a hint always names the next action. Change `LIMITS` only deliberately.
- `a11y.spec.ts` — no serious/critical axe violations (WCAG 2.1 AA) on every page.
