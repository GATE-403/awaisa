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
- Real-world metaphors: bookings are shown as an e-ticket (`common/components/Ticket`: tear-off calendar leaf, perforation with notches, stub with code + barcode; cancelled tickets get an «Отменена» pill, a grey leaf, struck-through time and a faded barcode). Feedback goes through iOS-style toasts (`useToast()` from `@awaisa/ui/Toast`, provider in the root layout): success/error/info.
- Material blur: only `backdrop-filter: var(--blur-material)` in source — Lightning CSS adds `-webkit-`. Writing both by hand makes the minifier drop the standard one.
- Motion: `--ease-standard`, `--ease-spring` for toggles/indicators; pressed state = `scale: 0.97`.
- Spacing on a 4px grid (`--space-1` = 4px … `--space-20` = 80px). Breakpoints (JS only, literal px in media queries): sm 640, md 768, lg 1024, xl 1280.

## Web app structure

The web app is a booking platform: any business registers and gets its own page at `/<slug>`; clients find businesses in the catalog on `/`. Awaisa Studio (`awaisa-studio`) is the first business, migrated from the single-salon version.

- Routes: `/` catalog of businesses (`?kind=`, `?q=`), `/<slug>` business page, `/<slug>/services`, `/<slug>/book` booking flow (`?service=` / `?specialist=` preselect), `/bookings` client's bookings, `/login` SMS sign-in (`?next=`), `/profile`, `/business` landing for owners, `/business/new` registration, `/manage` my businesses, `/manage/<slug>` owner cabinet (`?tab=schedule|services|masters|hours|profile`), `/ui` kit demo. Old `/book`, `/services`, `/admin` redirect to Awaisa Studio / `/manage`.
- A first path segment that isn't an app route is a business slug: keep `APP_SEGMENTS` (`constants/navigation.ts`) and `RESERVED_SLUGS` (`apps/api/src/businesses/business-rules.ts`) in sync when adding a top-level route.
- `src/app/` — routes only, thin files that render a feature page. Default exports only here.
- `src/features/<feature>/` — feature pages, their components, hooks and constants (`catalog`, `business`, `services`, `booking`, `bookings`, `auth`, `profile`, `forBusiness`, `manage`). Not `src/pages/`: that name is reserved by Next.js for the Pages Router.
- `src/common/components/` — shared app components (`Header`, `TabBar`, `Footer`, `Container`, `PageTitle`, `StoreShelf`, `StoreCard`, `Ticket`). `src/constants/` — app-wide constants (`platform.ts`: name, UTC+6, business kinds; `navigation.ts`).
- Data: server pages read `common/api/serverApi.ts` — `getBusiness(slug)` (business + catalog, deduped per request with `cache`, `notFound()` on 404) and `listBusinesses(kind, q)`. Dynamic routes pass the `params` promise into `<Suspense>` (`params.then(({ slug }) => …)`) so the shell stays prerendered. Business data reaches components as props — there are no per-business constants. URL-aware chrome (`Header`, `TabBar`) sits in `<Suspense>` in the root layout. Browser calls go through `common/api/clientApi.ts` to `/api/*`, which `next.config.ts` rewrites to `API_URL` (same origin: no CORS, works in the mobile WebView).
- Client bookings: guests can book without an account; `localStorage` keeps `{ id, token, snapshot }` per booking (`common/utils/bookingStorage.ts`) and the token lets them view/cancel. Signed-in clients also get the server list (`GET /me/bookings`: their bookings plus any made on their verified number), merged with device bookings on `/bookings`.
- Session on the client: `useSession()` (one shared store, fetches `/api/me` once; `status` is `loading | guest | signedIn`), `useRequireSession()` redirects guests to `/login?next=…`. The session is an httpOnly cookie set by the API through the `/api` rewrite — never read it from JS. Booking contacts skip the phone field when signed in. Phones are shown with `formatPhone()`.
- API types are mirrored in `common/api/types.ts` — keep them in sync with the API responses.

## App shell and responsive rules

- Layout variables live in `src/common/styles/shell.css`: `--header-height` (56/64), `--tabbar-height` (60 on phones, 0 from 768px), `--page-gutter` (16/24/32), `--section-gap`.
- Header is sticky and translucent (blur); it gets a hairline once the page scrolls. Primary nav is in the header from 768px and in the bottom `TabBar` on phones.
- `/book` hides the tab bar and shows its own fixed action bar (phones/tablets) or a sticky summary card (≥1024px). The action button always moves the client to the first unfinished step instead of being disabled.
- Completed booking steps collapse to one line with "Изменить". Anything fixed to the bottom pads for `env(safe-area-inset-bottom)`; the viewport uses `viewport-fit: cover`.
- Never read the current time during render on the server: use `useToday()` (server snapshot is `null`, the client fills it in).
- Catalog (`/`) and business pages mirror apple.com/store. Business page: `StoreHero` (name + description, live "next free slot" aside), `CategoryLinks`, then `StoreShelf` rows: Популярное, Мастера, Почему удобно, Как нас найти (hours from `formatWeekSchedule`, open status from `getOpeningStatus`).
- Search: the header magnifier opens `SearchPanel` (a top `Dialog variant="panel"` like apple.com: large input, quick links, live business suggestions from `GET /businesses?q`); the catalog page itself only has kind pills and a results heading.
- Owner cabinet (`features/manage`): sidebar navigation (`ManageNav`, pills on phones) + content column ≤ 840px; every section starts with `SectionHeader` (title, description, actions on the right); data lives in Settings-style inset groups with fixed column widths; empty states use `EmptyState`; edits happen in dialogs.
- `StoreShelf` is a full-bleed horizontal scroller whose first card aligns with the container edge; paddle buttons from 768px; the track is focusable for keyboard scrolling. Cards are `StoreCard` (eyebrow, title, description, footer, round "+" when it is a link).
- Live data on the client: `useNextSlot(serviceId)` (today/tomorrow first free slot). Working hours helpers live in `common/utils/workingHours.ts` (weekday 0 = Monday, like the API). Russian plurals: `pluralize(count, [one, few, many])`, slugs: `slugify()` (Cyrillic and Kyrgyz letters).

## Booking API (apps/api)

- Public: `GET /businesses?kind&q` (published businesses with at least one active service), `GET /businesses/:slug` (business + catalog), `GET /businesses/slug-available?slug`, `GET /availability?serviceId&specialistId&date`, `POST /bookings`, `GET|DELETE /bookings/:id` with `x-booking-token`. `specialistId=any` picks the first free specialist. Service ids are global, so the service decides the business.
- Businesses (`src/businesses`): `businesses`, `business_members` (owner/staff), `working_hours` (weekday 0 = Monday; no row = day off); categories, services, specialists and bookings carry `business_id`. New rows created by owners get UUID ids; new masters have no rating until reviews exist.
- Owners: `POST /businesses` (signed in; creates the business, owner membership, default hours 10–20 daily and a «Услуги» category), `GET /me/businesses`, and everything under `/manage/:slug` behind `BusinessAccessGuard` (member of the business or a platform admin from `ADMIN_PHONES`): profile `GET|PATCH`, `PUT hours`, categories, services (`PUT` full object; a new service is given to every active master), specialists, `GET schedule?date`, `POST bookings/:id/cancel`, `POST|DELETE time-off`.
- Time zone is fixed UTC+6 for every business (`src/common/business-time.ts`). Opening hours and slot step (15/30/60) are per business; lead time, booking horizon and reminder lead are in `src/bookings/booking-rules.ts`.
- Slots are computed by the pure `buildSlots` (`src/bookings/availability.ts`, unit-tested). Double booking is prevented by the Postgres exclusion constraint `bookings_no_overlap` (btree_gist); a violation returns 409 and the web re-fetches slots.
- Validation: Zod schemas in `*.schemas.ts` via `@Body({ schema })` / `@Query({ schema })` + global `StandardSchemaValidationPipe`. Rate limit per IP: `RATE_LIMIT_PER_MINUTE` (120) and `BOOKING_RATE_LIMIT_PER_MINUTE` (5) for `POST /bookings`; `GET /catalog` is not limited because the web server fetches it for every visitor from one IP (`trust proxy` is on for private networks).
- Awaisa Studio's catalog was seeded by the `SeedCatalog` migration and moved into the platform by `Businesses`; other businesses edit their data in the cabinet.

## Accounts, SMS and admin (apps/api)

- Sign-in by phone: `POST /auth/otp` (`channel: auto | sms`) → 6-digit code, sent to Telegram through the Telegram Gateway when `TELEGRAM_GATEWAY_TOKEN` is set (`checkSendAbility` pays, the send with its `request_id` is free, `ttl` refunds undelivered codes) and by SMS otherwise or when Telegram refuses the number; the response says which `channel` was used and the login page offers "Нет Telegram? Получить SMS". The resend cooldown is per channel. The code itself is ours (HMAC-hashed with `AUTH_SECRET`, 5 min, 5 attempts, one per 60 s and 10 per day per number), `POST /auth/verify` → creates the customer if new and sets the `awaisa_session` cookie (opaque token, sha256 in `sessions`, 30 days), `POST /auth/logout`. Phones are normalized to E.164 by `common/phone.ts` (`0555…`/`555…` → `+996555…`).
- Guards: `AuthGuard`, `OptionalAuthGuard` (booking creation links the booking to the signed-in customer and uses their verified phone), `AdminGuard` (`ADMIN_PHONES`). `@CurrentCustomer()` reads the customer.
- Profile: `GET|PATCH /me`, `GET /me/bookings`, `DELETE /me/bookings/:id`.
- Schedule (`/manage/:slug/…`): masters, bookings with phones and comments, time off; cancelling texts the client. Time off is subtracted from availability like a booking; the response lists bookings that fall inside it. `ADMIN_PHONES` are platform admins with access to every business.
- SMS: `SmsService` sends through Twilio's REST API when `SMS_DRIVER=twilio` (or Twilio credentials are present), otherwise logs messages (`SMS to …`) — read codes from the API log in development. Texts live in `notifications/messages.ts` (Cyrillic SMS segments are 70/67 characters). Confirmation goes out on booking, a reminder `REMINDER_LEAD_MINUTES` (2 h) before the visit from a 5-minute cron (`RemindersService`, rows claimed with `UPDATE … RETURNING`, safe with several instances), and a notice when the salon cancels. Booking flows never fail because of SMS (`sendSafely`).
- Env: `AUTH_SECRET` (required in production, ≥ 32 chars), `ADMIN_PHONES`, `PUBLIC_WEB_URL` (links in SMS), `SMS_DRIVER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID`, `TELEGRAM_GATEWAY_TOKEN`, `AUTH_RATE_LIMIT_PER_MINUTE`. `OTP_TEST_CODE` fixes the code and drops the per-number limits for tests; it is rejected in production.

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
- `platform.spec.ts` — an owner registers a business (auto slug, availability check), adds a service and a master, a guest finds it in the catalog and books, the owner sees the booking; reserved/taken slugs are refused; closed days are disabled.
- `account.spec.ts` — SMS sign-in (new client names themselves, wrong code shows attempts left, `/profile` is private), signed-in booking without a phone field visible from another device, staff schedule: non-staff blocked, close/reopen time, cancel a client's booking. The e2e API runs with `OTP_TEST_CODE=111111` and test staff numbers.
- `ux.spec.ts` — the main action is never disabled and jumps to the first unfinished step, stays on screen on phones, no validation before the first submit, inline errors keep input, 409 conflict and slot-loading failures recover, collapsed steps reopen, success screen offers next steps, no horizontal scroll at 320–1024px, tap targets ≥ 44px, keyboard-only booking. API errors are mocked with `page.route`.
- `cognitive-load.spec.ts` — budgets: ≤ 4 steps with ≤ 3-word titles, ≤ 9 options per decision, ≤ 20 words before the first choice, ≤ 2 required fields, happy path ≤ 7 actions, price/duration visible before committing, ≤ 1 primary button on screen, a hint always names the next action. Change `LIMITS` only deliberately.
- `a11y.spec.ts` — no serious/critical axe violations (WCAG 2.1 AA) on every page.
- Test data (bookings, businesses, customers) is named `E2E …` and deleted by `e2e/globalTeardown.ts` after the run (uses `DATABASE_URL` from the root `.env`).
