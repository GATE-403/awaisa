<p align="center">
  <img src="apps/web/src/app/icon.svg" width="96" height="96" alt="Awaisa">
</p>

<h1 align="center">Awaisa</h1>

<p align="center">Запись к мастерам в Бишкеке. Без звонков.</p>

Платформа онлайн-записи: любой бизнес (барбершоп, салон, ногти, SPA, стоматология) регистрируется и получает свою страницу `/<slug>`. Клиенты находят места и услуги в каталоге, выбирают мастера и время и записываются сами. У владельца кабинет: расписание, клиенты, аналитика, акции и настройки страницы.

## Монорепо

Turborepo + pnpm workspaces.

| Пакет | Что внутри |
| --- | --- |
| `apps/web` | Next.js (App Router): каталог, страницы бизнесов, запись, кабинет |
| `apps/api` | NestJS + TypeORM + PostgreSQL, Redis для кэша |
| `apps/mobile` | Expo-оболочка, показывает `apps/web` в WebView |
| `packages/tokens` | дизайн-токены (цвета, отступы, типографика) |
| `packages/ui` | UI-кит на Base UI и CSS Modules |
| `packages/contracts` | типы запросов и ответов API, общие для web и api |

## Запуск

```bash
cp .env.example .env
pnpm install
pnpm db:up      # PostgreSQL и Redis в Docker
pnpm db:seed    # демо-данные (только для разработки)
pnpm dev        # web :3000, api :4000 (/health), Expo
```

```bash
pnpm test       # юнит-тесты
pnpm test:e2e   # Playwright (нужен pnpm db:up)
```

`pnpm dev` запускает и Expo (`apps/mobile`): `i` / `a` в его панели или QR-код в Expo Go. Полный стек в Docker: `docker compose --profile app up --build`. Демо UI-кита: http://localhost:3000/ui.

Архитектура, правила дизайна, API и тесты описаны в [AGENTS.md](AGENTS.md).
