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
- Components: Input and Select also have `variant='plain'` (borderless, right-aligned value for Settings-style rows). Button (primary/secondary/outline/ghost/danger/link/contrast × sm/md/lg), ButtonLink (navigation styled as a button — use it instead of `Button render={<a>}`, which gets `role="button"`), Link (renders Next `<Link>` via `render`), Input, Field, Select, Checkbox (incl. indeterminate), Switch, Radio + RadioGroup, RadioCard, Tabs, Dialog, Skeleton. The set follows the Figma file `Awaisa` (Components section); colors, typography and sizes come from tokens, not from Figma.

## Design system (macOS / iOS principles)

The look follows Apple HIG and the restrained style of apple.com: depth through layers, not borders.

- Layers: page `--color-background` (grouped gray #F2F2F7 / black) → content cards `--color-surface` (white / #1C1C1E) with `--shadow-sm` → floating chrome in matte material `--color-material` + `backdrop-filter: var(--blur-material)` + 0.5px `--color-material-border`. Do not put borders around cards.
- Values come from Apple's macOS 26 UI kit (Figma «macOS 26 (Community)»): system accents (blue #0088ff/#0091ff, red #ff383c/#ff4245, …), label/fill alphas (fills 8–10%, tertiary label 25%), Thick material (#f6f6f6 72%, blur 30) and the 590 «emphasized» semibold. Text-carrying fills (`primary` #0071e3, `link`, `muted-foreground`) stay darker for AA.
- Colors are Apple semantic colors: `foreground` (label), `muted-foreground` (secondaryLabel, slightly darker for AA), `tertiary-foreground`, `subtle` (system fill), `border` (separator, use 0.5px hairlines), system blue/green/red/orange as `primary`/`success`/`danger`/`rating`. Never use palette values in components.
- Type: SF Pro on Apple devices, Inter elsewhere (`--font-sans` / `--font-display` for headings). iOS Dynamic Type scale: xs 12, footnote 13, sm 15 (subheadline), md 17 (body), lg 20, xl 22, 2xl 28, 3xl 34 (large title), 4xl 48. Titles are bold with negative tracking (`--tracking-tight` / `--tracking-title`).
- Shapes: buttons, chips, tab bar and segmented controls are capsules (`--radius-full`); fields 12, cards 16–22, sheets 28. Touch targets ≥ 44px (`--control-height-md`).
- Patterns: Settings-style inset grouped lists (`RadioGroup variant=inset`, uppercase footnote section headers, hairline separators inset 16px, value/chevron on the right), checkmark instead of radio circles in lists, segmented `Tabs`, iOS green switches, floating material tab bar and action bar on phones.
- Icons: Phosphor (`@phosphor-icons/react/ssr`) for UI glyphs only (`regular`, `fill` for the active tab, `bold` for chevrons). No decorative icons or illustrations — the look is typographic.
- Look follows apple.com/store: page `#f5f5f7`, text `#1d1d1f`/`#6e6e73`, blue `#0071e3` for fills and `--color-link` `#0066cc` for blue text on gray (AA contrast). Two-tone headings: bold title + muted continuation (`PageTitle`, `StoreShelf`). White cards, radius 28, soft `--shadow-sm`, small uppercase eyebrow (`--color-highlight` for "new/hit").
- Controls follow the macOS 26 kit (Figma «macOS 26 (Community)», Buttons / Segmented Controls): flat push buttons with rounded-rect corners (sm 8, md/lg 12), 510 labels. `primary` = Default (accent `#0a6cf0` fill — the kit's #0D6FFF a hair deeper for AA), `secondary` = Bordered Neutral (`--color-fill` 5%), `outline` = Bordered Secondary (accent at 10%, accent label), `ghost` = Borderless, `danger` = Bordered Destructive (neutral fill, `--color-danger-text`). Segmented `Tabs`: 5% track, the selected segment filled with the accent and a white label, hairlines between unselected segments. Time/day toggles are neutral fills, pressed = accent. Page headers use `--text-display` (56/60 bold) from 1024px. Businesses are shown with `BusinessTile` (app-icon style gradient square, colour picked from the name).
- Layers in dark: page #000 → card `--color-surface` #1C1C1E → sheet rows `--color-sheet-surface` #2C2C2E on `--color-sheet`; each layer up is lighter, so depth shows without shadows.
- Pictures lead: businesses have a cover (catalog card, business page) and up to 6 work photos (`Работы` shelf); masters have photos (contact-style picker in the master sheet). Without a cover the card shows the tinted `BusinessTile`.
- Restraint: no glow, one primary action per screen, secondary actions as compact `secondary` buttons. No glass/blur effects except the standard material on header, tab bar and booking bar.
- Real-world metaphors: bookings are shown as an e-ticket (`common/components/Ticket`: tear-off calendar leaf, perforation with notches, stub with code + barcode; cancelled tickets get an «Отменена» pill, a grey leaf, struck-through time and a faded barcode). Feedback goes through iOS-style toasts (`useToast()` from `@awaisa/ui/Toast`, provider in the root layout): success/error/info.
- Material blur: only `backdrop-filter: var(--blur-material)` in source — Lightning CSS adds `-webkit-`. Writing both by hand makes the minifier drop the standard one.
- Motion: `--ease-standard`, `--ease-spring` for toggles/indicators; pressed state = `scale: 0.97`. The catalog card morphs into the business cover with React `<ViewTransition name="business-<slug>">`; phone sheets slide up with a slight settle. Everything is cut by `prefers-reduced-motion`. In the app, `haptic()` (`nativeBridge.ts`) plays taptic feedback (booking done, error, cancel, drag pick-up).
- Reversible actions are not confirmed: cancelling (client or salon) and dragging a booking happen at once with «Вернуть» in the toast (`useToast().show({ action })`); the API keeps a 15 s undo window (`UNDO_WINDOW_SECONDS`, `POST …/restore`) and sends the salon's SMS only after it.
- Inputs format while typing: `maskPhoneInput` (+996 555 123 456) and `maskAmountInput` (1 500) from `common/utils/inputMasks.ts`; tel/numeric keyboards and `one-time-code`.
- Copy uses verbs and the next action («Добавьте первую услугу», «Запишитесь к мастеру»).
- Spacing on a 4px grid (`--space-1` = 4px … `--space-20` = 80px). Breakpoints (JS only, literal px in media queries): sm 640, md 768, lg 1024, xl 1280.

## Web app structure

The web app is a booking platform: any business registers and gets its own page at `/<slug>`; clients find businesses in the catalog on `/`. Awaisa Studio (`awaisa-studio`) is the first business, migrated from the single-salon version.

- Routes: `/` catalog of businesses (`?kind=`, `?q=`), `/map` places on a map (`?kind=`; «Рядом со мной» sorts by distance), `/<slug>` business page, `/<slug>/services`, `/<slug>/book` booking flow (`?service=` / `?specialist=` / `?branch=` preselect), `/bookings` client's bookings, `/login` SMS sign-in (`?next=`), `/profile`, `/business` landing for owners, `/business/new` registration, `/manage` my businesses, `/manage/<slug>` owner cabinet (`?tab=schedule|services|masters|hours|profile`), `/ui` kit demo. Old `/book`, `/services`, `/admin` redirect to Awaisa Studio / `/manage`.
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
- Header is sticky and translucent (blur); it gets a hairline once the page scrolls. From 768px it is a three-column bar like apple.com's global nav: logo, centred small text links (no backgrounds; the current page is darker and semibold), icons (search, theme, account). On phones it shows only the logo, search and account; primary nav lives in the bottom `TabBar` and the theme choice in the footer (`ThemeSwitcher`). Business pages add a compact «Записаться» pill (28px, with a 44px hit area) at the end of the bar.
- Catalog kinds are underlined text tabs on a hairline, not pills. Catalog cards (`features/catalog/components/BusinessCard`) are product cards: picture, name, live «Свободно сегодня с 15:00» (one `GET /next-free?slugs=` per page through `NextFreeProvider`) and opening status, price — no marketing blurb.
- `/book` hides the tab bar and shows its own fixed action bar (phones/tablets) or a sticky summary card (≥1024px). The action button always moves the client to the first unfinished step instead of being disabled.
- Smart defaults: a service with one master fills the master step; the suggested day skips ahead (up to 6 open days) when the first open day has no free time; «Снова» in history passes `?service=&specialist=`.
- Completed booking steps collapse to one line with "Изменить". Anything fixed to the bottom pads for `env(safe-area-inset-bottom)`; the viewport uses `viewport-fit: cover`.
- Never read the current time during render on the server: use `useToday()` (server snapshot is `null`, the client fills it in).
- Catalog (`/`) and business pages mirror apple.com/store. Business page: `StoreHero` (name + description, live "next free slot" aside), `CategoryLinks`, then `StoreShelf` rows: Популярное, Мастера, Почему удобно, Как нас найти (hours from `formatWeekSchedule`, open status from `getOpeningStatus`).
- Search: the header magnifier opens `SearchPanel` (a top `Dialog variant="panel"` like apple.com: large input, quick links, live business suggestions from `GET /businesses?q`); the catalog page itself only has kind pills and a results heading.
- `/bookings`: «Предстоящие» (countdown, ticket, actions under it: Wallet, calendar, route, cancel) and «История» (compact rows with a mini date leaf, status and «Снова» to rebook). `/profile` is Apple ID-style: avatar, name, phone, grouped links, theme, sign-out row.
- Schedule is a day calendar (`DayCalendar`): hour axis, a column per master, booking blocks sized by duration (1.6 px per minute, compact one-line layout under 72px, phone and price from 128px), each master tinted with one system colour (`getMasterTint`, dot in the column head) on an opaque background, hatched non-working hours and time off, a red now-line for today; cancelled blocks sit under live ones. Clicking an empty spot in a master's column (hover shows a dashed slot preview snapped to the business slot step) or «Новая запись» opens `NewBookingDialog` (master, service, free time from `/availability`, client name + phone, comment) → `POST /manage/:slug/bookings`; the client gets the SMS confirmation. Clicking a block opens `BookingDetailsDialog` (client, phone, price, comment; call / cancel with confirmation).
- Owner cabinet (`features/manage`) is a self-contained app: no site footer or client tab bar there (`isCabinetPath`). Header: `BusinessTile` (lg) + two-tone title «<Бизнес>. Кабинет», with «Все бизнесы» and «Открыть страницу ↗» on the right. Sections are switched with `TextTabs` (`common/components/TextTabs`, the same underlined text tabs as the catalog kinds; `?tab=`), then `SetupProgress` while setup is incomplete. Content is ≤ 840px, the schedule is full width. Every section starts with `SectionHeader` (the title is visually hidden because the tab names the section; the hint and actions form the toolbar). Forms are Settings rows: label left, `plain` control right; edits collect in a draft and a floating material save bar («Отменить / Сохранить») appears only while there are changes. Service rows: star for popular, duration in the subtitle, price as the right-hand value. Data lives in Settings-style inset groups; empty states use `EmptyState`; edits happen in iOS form sheets: `common/components/Sheet` (`Dialog variant='sheet'`: centred on desktop, slides up from the bottom on phones; bar «Отмена · title · action»; inset groups from `Sheet.module.css` — `row`, `textRow` for label-less fields, `checkRow` with a trailing checkmark, `groupFooter`, red `danger` row). Booking details is a contact-style sheet: tinted header, client with Call / WhatsApp / SMS tiles, rows, red cancel row with an alert to confirm.
- Over today's calendar `NowBar` says who is in the chair and who is next («Следующий: Данияр в 14:30, через 20 мин»). While the cabinet is open `useNewBookingAlerts` polls `GET bookings/recent?since=` every 20 s: chime, toast and (tab hidden, permission granted) a system notification; bookings staff made themselves are skipped. Bookings drag to another time or master (mouse at once, touch after a long press; `useBookingDrag`).
- `/business/new` is a three-question setup (name and address → kind with a starter menu from `constants/serviceTemplates.ts`, untick and fix prices → contacts); template services are created with the business.
- Branches: every business has ≥ 1 branch (address, phone, map pin). The cabinet «Филиалы» tab edits them in a sheet with `LocationPicker` (move the map under a fixed pin). Masters may belong to one branch (`branchId`, null = all). With 2+ branches the booking page shows branch chips above the steps; masters and «любой мастер» are limited to that branch. The business page shows a branch card each and a mini map (`BranchesMap`).
- Maps: `common/components/MapView` (Leaflet, client-only via `next/dynamic`), OpenStreetMap tiles by default (dark theme = CSS filter); set `NEXT_PUBLIC_MAP_TILES_URL` / `NEXT_PUBLIC_MAP_ATTRIBUTION` for a keyed provider (2GIS, MapTiler) in production. `/map` is a list + map (side by side from 900px, map over a sheet-like list on phones), live «Свободно сегодня с …» per place.
- Schedule day picker is `DayStrip` (iOS Calendar week row: weekday over a number in a circle, selected = filled, today = red, «Сегодня» button) sitting in one panel with the `DayCalendar`.
- `StoreShelf` is a full-bleed horizontal scroller whose first card aligns with the container edge; paddle buttons from 768px; the track is focusable for keyboard scrolling. Cards are `StoreCard` (eyebrow, title, description, footer, round "+" when it is a link).
- Live data on the client: `useNextSlot(serviceId)` (today/tomorrow first free slot). Working hours helpers live in `common/utils/workingHours.ts` (weekday 0 = Monday, like the API). Russian plurals: `pluralize(count, [one, few, many])`, slugs: `slugify()` (Cyrillic and Kyrgyz letters).

## Booking API (apps/api)

- Public: `GET /businesses?kind&q` (published businesses with at least one active service), `GET /businesses/:slug` (business + catalog), `GET /businesses/slug-available?slug`, `GET /availability?serviceId&specialistId&date[&branchId]`, `GET /map?lat&lng&kind&q` (pinned branches of published businesses, haversine `distanceKm`, nearest first), `GET /next-free?slugs=` (first free time today/tomorrow per business, quickest service, any master), `POST /bookings`, `GET|DELETE /bookings/:id` with `x-booking-token`. `specialistId=any` picks the first free specialist. Service ids are global, so the service decides the business.
- Businesses (`src/businesses`): `businesses`, `business_members` (owner/staff), `working_hours` (weekday 0 = Monday; no row = day off); categories, services, specialists and bookings carry `business_id`. New rows created by owners get UUID ids; new masters have no rating until reviews exist.
- Owners: `POST /businesses` (signed in; creates the business, owner membership, default hours 10–20 daily, a «Услуги» category and any template `services`), `GET /me/businesses`, and everything under `/manage/:slug` behind `BusinessAccessGuard` (member of the business or a platform admin from `ADMIN_PHONES`): profile `GET|PATCH`, `PUT hours`, categories, services (`PUT` full object; a new service is given to every active master), specialists, `GET schedule?date`, `POST bookings` (staff books a client in: phone required, same slot rules and SMS), `POST|PUT|DELETE branches` (the last branch can't be deleted or closed), `PATCH bookings/:id` (move: date, time, master; time off and overlaps refused, SMS after the undo window), `POST bookings/:id/cancel`, `POST bookings/:id/restore`, `GET bookings/recent?since`, `POST|DELETE time-off`, photos: `POST|DELETE cover`, `POST|DELETE photos`, `POST|DELETE specialists/:id/photo` (multipart `file`, ≤ 10 MB).
- Branches (`branches` table, `src/businesses/branch.entity.ts`): bookings store `branch_id` (the master's branch, else the requested one, else the first); a booking's view uses the branch address and phone. `map` is a reserved slug.
- Photos (`src/media`): every upload is re-encoded by sharp (EXIF dropped, rotated, capped: cover 1600×1000, photo 1400 wide, avatar 480², WebP q80). `StorageService` writes to S3-compatible storage (Cloudflare R2) when `STORAGE_DRIVER=s3` / `S3_BUCKET` is set, else to `UPLOAD_DIR` served by `GET /media/:folder/:file` (`/api/media/…` from the web).
- Wallet (`src/wallet`): `GET /wallet/config`, `POST /bookings/:id/wallet` (token) or `/me/bookings/:id/wallet` → short-lived HMAC-signed `/api/wallet/apple/:id` (.pkpass via passkit-generator, needs `WALLET_*` certs) and a «Save to Google Wallet» JWT link (`GOOGLE_WALLET_*`). Buttons appear only when configured.
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
- Env (photos, wallet): `STORAGE_DRIVER`, `UPLOAD_DIR`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`; `WALLET_PASS_TYPE_ID`, `WALLET_TEAM_ID`, `WALLET_CERT_PEM`, `WALLET_KEY_PEM`, `WALLET_KEY_PASSPHRASE`, `WALLET_WWDR_PEM`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT` (PEM/JSON raw or base64).
- Env: `AUTH_SECRET` (required in production, ≥ 32 chars), `ADMIN_PHONES`, `PUBLIC_WEB_URL` (links in SMS), `SMS_DRIVER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID`, `TELEGRAM_GATEWAY_TOKEN`, `AUTH_RATE_LIMIT_PER_MINUTE`. `OTP_TEST_CODE` fixes the code and drops the per-number limits for tests; it is rejected in production.

## Mobile ↔ web bridge

- The WebView loads `EXPO_PUBLIC_WEB_URL` (in `apps/mobile/.env`), or in dev `http://<dev machine LAN IP>:3000`.
- Before the page loads, the shell sets `window.__NATIVE_APP__ = { platform, version }`.
- Web → native: `postToNative()` (`openExternal`, `haptic` → expo-haptics) from `apps/web/src/common/utils/nativeBridge.ts`. Message types are mirrored in `apps/mobile/src/common/utils/nativeBridge.ts` — change both together.
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
- `platform.spec.ts` — an owner registers a business (auto slug, availability check, kind templates), adds a second branch, uploads a cover, adds a service and a master, a guest finds it in the catalog and books, the owner sees the booking, books a walk-in by tapping an empty slot and drags it (desktop) with undo; reserved/taken slugs are refused; closed days are disabled.
- `account.spec.ts` — SMS sign-in (new client names themselves, wrong code shows attempts left, `/profile` is private), signed-in booking without a phone field visible from another device, staff schedule: non-staff blocked, close/reopen time, cancel a client's booking. The e2e API runs with `OTP_TEST_CODE=111111` and test staff numbers.
- `ux.spec.ts` — the main action is never disabled and jumps to the first unfinished step, stays on screen on phones, no validation before the first submit, inline errors keep input, 409 conflict and slot-loading failures recover, collapsed steps reopen, success screen offers next steps, no horizontal scroll at 320–1024px, tap targets ≥ 44px, keyboard-only booking. API errors are mocked with `page.route`.
- `cognitive-load.spec.ts` — budgets: ≤ 4 steps with ≤ 3-word titles, ≤ 9 options per decision, ≤ 20 words before the first choice, ≤ 2 required fields, happy path ≤ 7 actions, price/duration visible before committing, ≤ 1 primary button on screen, a hint always names the next action. Change `LIMITS` only deliberately.
- `map.spec.ts` — `/map` lists pinned places, books at the chosen branch, sorts by distance with a granted geolocation, filters by kind.
- `a11y.spec.ts` — no serious/critical axe violations (WCAG 2.1 AA) on every page.
- Test data (bookings, businesses, customers) is named `E2E …` and deleted by `e2e/globalTeardown.ts` after the run (uses `DATABASE_URL` from the root `.env`).
