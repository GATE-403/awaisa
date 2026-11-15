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
| `pages.js` | The site's server-rendered pages (catalog, a place, its menu, map, leaderboard) at a rising rate up to `MAX_RATE` pages/s. |

## Results — 15 November 2026

One MacBook (14 cores, 24 GB) runs everything: Postgres, Redis, one API process, one Next process and k6 in Docker. Treat the numbers as per-process ceilings on that machine; a Linux server with the database elsewhere does better.

**Visitors (`browse.js`, 300 at once).** No errors. Every endpoint's 95th percentile stays under 30 ms with the cache, under 30 ms without it too; the API process uses 62% of one core with the cache, 98% without.

**One API process (`capacity.js`).**

| | Holds (p95) | Bends at |
| --- | --- | --- |
| Cache on | ~1 500 req/s (30 ms) | ~1 750 req/s |
| Cache off | ~700 req/s (23 ms) | ~780 req/s |

A visitor makes ~2 requests a second while browsing, so one process serves roughly 700 people browsing at the same moment with the cache, ~350 without. Past the bend Node is CPU-bound (one thread): add `api` instances (`PROCESS_ROLE=api`), they share Redis.

**Rush hour (`booking-rush.js`, 200 at once).** Never a double booking (the `bookings_no_overlap` constraint). It found a bug, fixed here: two bookings racing for one time could deadlock in Postgres, which answered 500 to about 5% of them after up to 8 s; a deadlock now means «the time is taken» like an overlap (409, or the next free master). After the fix: 1 booked, 199 refused cleanly, p95 ~200 ms, in six runs. Overlap refusals no longer fill the error log either.

**Pages (`pages.js`).** One `next start` process holds ~100 pages/s at 10 ms and ~150 at 100 ms; beyond that it is CPU-bound (~130% of a core) and the Mac's accept queue (`kern.ipc.somaxconn` 128) refuses connections. **The site's server rendering, not the API, is the first ceiling** — in production run several Next processes per machine and put pictures and static files behind a CDN.

**Where the database time goes.** 55% of all database time in the runs was the «Для вас» candidate query (`RecommendationsService`, ~160 rows per call, 4.6 ms) and most of the rest its free-time lookups — `/recommendations` is the one public endpoint with no cache, and the heaviest. The candidate set does not depend on the person, so it can be cached for a minute and scored per request.
