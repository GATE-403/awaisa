// A visitor's path through the public API, as the site and the app make it: catalog, offers,
// free times, picks, a place, its services' free times, tomorrow's slots and its reviews.
// Run: pnpm --filter api load:browse (see load/README.md). BASE is the API's origin.
import { check, group, sleep } from 'k6'
import http from 'k6/http'

const BASE = __ENV.BASE || 'http://host.docker.internal:4400'
const PEAK = Number(__ENV.PEAK || 300)
// What a visitor waits for a page's data at the 95th percentile before it feels slow.
const BUDGET_MS = 500
const ENDPOINTS = [
  'catalog',
  'offers',
  'next-free',
  'recommendations',
  'place',
  'reviews',
  'services-next-free',
  'availability',
]

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.round(PEAK / 30) },
        { duration: '45s', target: Math.round(PEAK / 6) },
        { duration: '45s', target: Math.round(PEAK / 3) },
        { duration: '45s', target: PEAK },
        { duration: '60s', target: PEAK },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  // A threshold per endpoint also makes k6 report each one's timings separately.
  thresholds: {
    http_req_failed: ['rate<0.01'],
    ...Object.fromEntries(
      ENDPOINTS.map((name) => [`http_req_duration{name:${name}}`, [`p(95)<${BUDGET_MS}`]]),
    ),
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
}

// Business time is UTC+6 everywhere.
const dayKey = (offsetDays) =>
  new Date(Date.now() + 6 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)

export const setup = () => {
  const places = http.get(`${BASE}/businesses?limit=40`).json()
  const pages = places.slice(0, 12).map((place) => {
    const page = http.get(`${BASE}/businesses/${place.slug}`).json()
    const services = page.catalog.services.filter((service) => service.isActive !== false)
    return { slug: place.slug, serviceIds: services.map((service) => service.id) }
  })
  return { slugs: places.map((place) => place.slug), pages }
}

const pick = (items) => items[Math.floor(Math.random() * items.length)]

const get = (path, name) => {
  const response = http.get(`${BASE}${path}`, { tags: { name } })
  check(response, { [`${name} 200`]: (r) => r.status === 200 })
  return response
}

export default ({ slugs, pages }) => {
  group('catalog', () => {
    get('/businesses?limit=24', 'catalog')
    get('/businesses/offers?limit=24', 'offers')
    get(`/next-free?slugs=${slugs.slice(0, 24).join(',')}`, 'next-free')
    get('/recommendations?limit=12', 'recommendations')
  })
  sleep(1 + Math.random())

  const page = pick(pages)
  group('place', () => {
    get(`/businesses/${page.slug}`, 'place')
    get(`/businesses/${page.slug}/reviews?limit=20`, 'reviews')
  })
  sleep(1 + Math.random())

  group('booking form', () => {
    get(`/businesses/${page.slug}/next-free-services`, 'services-next-free')
    get(
      `/availability?serviceId=${pick(page.serviceIds)}&specialistId=any&date=${dayKey(1)}`,
      'availability',
    )
  })
  sleep(1 + Math.random())
}

// The full numbers as JSON next to the script (results/), for the report.
export const handleSummary = (data) => ({
  [`/scripts/results/${__ENV.RUN || 'browse'}.json`]: JSON.stringify(data, null, 2),
  stdout: `${Math.round(data.metrics.http_reqs.values.rate)} req/s, failed ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`,
})
