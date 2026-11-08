# awaisa

Turborepo: `apps/web` (Next.js) + `apps/api` (NestJS, TypeORM, PostgreSQL) + `apps/mobile` (Expo WebView shell) + `packages/ui` (UI kit on Base UI) + `packages/tokens` (design tokens).

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health: `/health`)
- Booking flow: http://localhost:3000/book · UI kit demo: http://localhost:3000/ui

- Mobile: `pnpm dev` also starts Expo (`apps/mobile`) — press `i` / `a` in its pane or scan the QR code with Expo Go. The app shows the web app in a WebView.

Full stack in Docker: `docker compose --profile app up --build`.
