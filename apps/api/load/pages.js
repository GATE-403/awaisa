// The site's pages as a browser asks for them (the server-rendered HTML; pictures, scripts and
// the API calls the page makes afterwards are not counted): catalog, a place, its menu, the
// map, «Образы» and the leaderboard, at a rising rate. Run: pnpm --filter api load:pages (load/README.md).
// WEB is the Next server's origin (`next start` of a production build, not `next dev`).
import { check } from 'k6'
import http from 'k6/http'

const WEB = __ENV.WEB || 'http://host.docker.internal:3400'
const BASE = __ENV.BASE || 'http://host.docker.internal:4400'
const MAX_RATE = Number(__ENV.MAX_RATE || 400)
// VUS=16: a closed loop instead of the ramp, that many pages in flight for DURATION: the most one
// Next process serves (how the before and after in load/README.md were measured). ONLY=<name>
// keeps to one page of ROUTES; `search` (a search, rendered per request) is asked for only so.
const VUS = Number(__ENV.VUS || 0)
const DURATION = __ENV.DURATION || '20s'
const ONLY = __ENV.ONLY
const PAGES = ['catalog', 'place', 'services', 'map', 'feed', 'top', 'search']
const ROUTES = {
  catalog: () => '/',
  place: (slug) => `/${slug}`,
  services: (slug) => `/${slug}/services`,
  map: () => '/map',
  feed: () => '/feed',
  top: () => '/top',
  search: () => `/?q=${encodeURIComponent('стрижка')}`,
}
// The share of each page in the mix.
const MIX = ['catalog', 'catalog', 'place', 'place', 'services', 'map', 'feed', 'top']

export const options = {
  scenarios: VUS
    ? { pages: { executor: 'constant-vus', vus: VUS, duration: DURATION } }
    : {
        pages: {
          executor: 'ramping-arrival-rate',
          startRate: 10,
          timeUnit: '1s',
          preAllocatedVUs: 100,
          maxVUs: 1000,
          stages: [
            { duration: '30s', target: Math.round(MAX_RATE / 4) },
            { duration: '30s', target: Math.round(MAX_RATE / 2) },
            { duration: '30s', target: Math.round((MAX_RATE * 3) / 4) },
            { duration: '30s', target: MAX_RATE },
          ],
        },
      },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    ...Object.fromEntries(PAGES.map((name) => [`http_req_duration{name:${name}}`, ['p(95)<800']])),
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
}

export const setup = () => ({
  slugs: http
    .get(`${BASE}/businesses?limit=40`)
    .json()
    .map((place) => place.slug),
})

const pick = (items) => items[Math.floor(Math.random() * items.length)]

export default ({ slugs }) => {
  const name = ONLY || pick(MIX)
  const response = http.get(`${WEB}${ROUTES[name](pick(slugs))}`, {
    tags: { name },
    timeout: '15s',
  })
  check(response, { ok: (r) => r.status === 200 })
}

export const handleSummary = (data) => ({
  [`/scripts/results/${__ENV.RUN || 'pages'}.json`]: JSON.stringify(data, null, 2),
  stdout: `${Math.round(data.metrics.http_reqs.values.rate)} pages/s on average, failed ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%, p95 ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms\n`,
})
