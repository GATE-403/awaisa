# Load tests

k6 scenarios against a production build, on a stand of its own (database `awaisa_load` with fresh demo data, Redis db 6, ports 4400 / 3400), so the dev servers and their data are untouched. k6 runs from the official Docker image — nothing to install.

```bash
pnpm db:up                              # Postgres and Redis
./apps/api/load/stand.sh up             # API on :4400 (add `web` for the site on :3400)
pnpm --filter api load:browse           # or load:capacity, load:rush, load:pages
./apps/api/load/stand.sh down           # stop it and drop awaisa_load
```

`API_CACHE=off ./apps/api/load/stand.sh up` measures the database path with nothing cached. Options go to k6 after the script: `./apps/api/load/k6.sh capacity.js -e MAX_RATE=1600 --out csv=/scripts/results/run.csv`. Results (JSON summaries, CSV) land in `results/`, which git ignores.

| Scenario | What it does |
| --- | --- |
| `browse.js` | A visitor's path — catalog, offers, free times, «Для вас», a place, its reviews, its services' free times, tomorrow's slots — with 1–2 s between steps, ramping to `PEAK` (300) people. |
| `capacity.js` | The same mix at a rising arrival rate up to `MAX_RATE` req/s (open model): where one API process bends. |
| `booking-rush.js` | `PEOPLE` (200) book the same free time at once, one master (`MODE=one`) or any master (`MODE=any`): exactly one gets it per master, everyone else a clean 409. |
| `pages.js` | The site's server-rendered pages (catalog, a place, its menu, map, «Образы», leaderboard) at a rising rate up to `MAX_RATE` pages/s; with `-e VUS=16` a closed loop of that many pages in flight for `DURATION` (20s), the most one Next process serves; `-e ONLY=place` (or `catalog`, `services`, `map`, `feed`, `top`, `search`) keeps to one page. |

## A place's pages served whole from the cache: 22 November 2026

`pages.js` against one `next start` process, the same machine, before and after. Closed loop (`./k6.sh pages.js -e VUS=16`), so each figure is what the process gives at 100% of its core:

| Page | Before | After |
| --- | --- | --- |
| The mix (catalog ×2, place ×2, services, map, «Образы», leaderboard) | 168 pages/s, p95 107 ms | **252 pages/s**, p95 101 ms |
| A place `/<slug>` | 115 | **1 255**, p95 22 ms |
| Its menu `/<slug>/services` | 162 | **~2 000** |
| Catalog `/` | 108 | 149 (rendered per request) |
| Map `/map`, «Образы» `/feed`, leaderboard `/top` | 204, 175, 113 | the same (rendered per request) |

**What it was.** Each page's static shell was only the header, tab bar and skeletons (28 KB); everything below streamed and was rendered on every request: ~8 ms of CPU a page, ~350 KB of HTML of which ~200 KB the RSC payload, all from data already in the server cache. The data was cached, the rendering was not. The profile had no single hot spot: React's own rendering (Flight and HTML) was ~70% of the CPU and our components ~25%. Turning `partialPrefetching` off (it embeds a second, prefetch render in each page) changed nothing measurable, so it stays.

**What changed.** `/<slug>` had no `generateStaticParams`, so a place's page could never be cached. It now has one (a slug no business can have, so the build needs no API); each place is drawn on its first visit and served whole from the cache afterwards (`x-nextjs-cache: HIT`, ~3 ms), redrawn when its data's `cacheLife` runs out (a minute) or the owner's save calls `updateTag`. The booking `/<slug>/book` stays per request (`connection()`): the form opens on the link's query, which a cached page could only draw once scripts load. Client components that read `useSearchParams` are left out of a cached page's HTML, so the header now reads the catalog's query only on «/» (`CatalogQuery`); otherwise it would appear on a place's page only after scripts. It also needed the `@modal/[...rest]` catch-all gone: its `rest` param was a param of every page it matched, never known, so no place could be cached; `BookingModalGate` now hides the booking sheet on any other address. An unknown slug ends as a 404 once drawn (it answered 200 with «not found» streamed in).

**Tried and dropped.** The catalog, map, «Образы» and leaderboard read `searchParams`, which keeps them per request even with no query. Rewriting their plain addresses (and `?kind=` alone) in `proxy.ts` to cached twins worked on the server (the mix reached ~1 230 pages/s) but not in the browser: the client router keeps one route tree per path, so the prefetch of `/?kind=…` asked for the twin's segments and those responses never finished (an open connection per prefetch, `networkidle` never reached). Making these pages cacheable needs the query out of their server render, or a Next that handles it.

**Several web processes.** Not added. The catalog-like pages are the ceiling now (~110-200 pages/s each). Running more `next start` processes would raise it, but first they need a shared cache: each process keeps its own `use cache` entries and cached pages, and `updateTag` after an owner's save reaches only the process that ran it, so the others would show the old page for up to a minute (the `cacheLife`). A shared cache handler (Redis, `cacheHandlers` in `next.config.ts`) is the step before replicas.

## Results: 15 November 2026

One MacBook (14 cores, 24 GB) runs everything: Postgres, Redis, one API process, one Next process and k6 in Docker. Treat the numbers as per-process ceilings on that machine; a Linux server with the database elsewhere does better.

**Visitors (`browse.js`, 300 at once).** No errors. Every endpoint's 95th percentile stays under 30 ms with the cache, under 30 ms without it too; the API process uses 62% of one core with the cache, 98% without.

**One API process (`capacity.js`).**

| | Holds (p95) | Bends at |
| --- | --- | --- |
| Cache on | ~1 500 req/s (30 ms) | ~1 750 req/s |
| Cache off | ~700 req/s (23 ms) | ~780 req/s |

A visitor makes ~2 requests a second while browsing, so one process serves roughly 700 people browsing at the same moment with the cache, ~350 without. Past the bend Node is CPU-bound (one thread): add `api` instances (`PROCESS_ROLE=api`), they share Redis.

**Rush hour (`booking-rush.js`, 200 at once).** Never a double booking (the `bookings_no_overlap` constraint). It found a bug, fixed here: two bookings racing for one time could deadlock in Postgres, which answered 500 to about 5% of them after up to 8 s; a deadlock now means «the time is taken» like an overlap (409, or the next free master). After the fix: 1 booked, 199 refused cleanly, p95 ~200 ms, in six runs. Overlap refusals no longer fill the error log either.

**Pages (`pages.js`).** One `next start` process holds ~100 pages/s at 10 ms and ~150 at 100 ms; beyond that it is CPU-bound (~130% of a core) and the Mac's accept queue (`kern.ipc.somaxconn` 128) refuses connections. **The site's server rendering, not the API, is the first ceiling.** (22 November, above: a place's pages are now served whole from the cache.)

**Where the database time goes.** 55% of all database time in the runs was the «Для вас» candidate query (`RecommendationsService`, ~160 rows per call, 4.6 ms) and most of the rest its free-time lookups — `/recommendations` is the one public endpoint with no cache, and the heaviest. The candidate set does not depend on the person, so it can be cached for a minute and scored per request.
