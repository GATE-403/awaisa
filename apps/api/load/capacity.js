// How many requests a second one API process takes before answers slow down: the browse mix
// at a rising arrival rate (open model - new requests keep coming however slow answers get).
// Run: pnpm --filter api load:capacity (see load/README.md).
import { check } from 'k6'
import http from 'k6/http'

const BASE = __ENV.BASE || 'http://host.docker.internal:4400'
const MAX_RATE = Number(__ENV.MAX_RATE || 2000)

export const options = {
  scenarios: {
    capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { duration: '30s', target: Math.round(MAX_RATE / 4) },
        { duration: '30s', target: Math.round(MAX_RATE / 2) },
        { duration: '30s', target: Math.round((MAX_RATE * 3) / 4) },
        { duration: '30s', target: MAX_RATE },
      ],
    },
  },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
}

const dayKey = (offsetDays) =>
  new Date(Date.now() + 6 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)

export const setup = () => {
  const places = http.get(`${BASE}/businesses?limit=40`).json()
  const pages = places.slice(0, 12).map((place) => {
    const page = http.get(`${BASE}/businesses/${place.slug}`).json()
    return { slug: place.slug, serviceIds: page.catalog.services.map((service) => service.id) }
  })
  return { slugs: places.map((place) => place.slug), pages }
}

const pick = (items) => items[Math.floor(Math.random() * items.length)]

export default ({ slugs, pages }) => {
  const page = pick(pages)
  // Weighted like a visit: lists and pages more often than the heavier free-time answers.
  const requests = [
    ['catalog', '/businesses?limit=24'],
    ['offers', '/businesses/offers?limit=24'],
    ['next-free', `/next-free?slugs=${slugs.slice(0, 24).join(',')}`],
    ['recommendations', '/recommendations?limit=12'],
    ['place', `/businesses/${page.slug}`],
    ['place', `/businesses/${page.slug}`],
    ['reviews', `/businesses/${page.slug}/reviews?limit=20`],
    ['services-next-free', `/businesses/${page.slug}/next-free-services`],
    [
      'availability',
      `/availability?serviceId=${pick(page.serviceIds)}&specialistId=any&date=${dayKey(1)}`,
    ],
  ]
  const [name, path] = pick(requests)
  const response = http.get(`${BASE}${path}`, { tags: { name }, timeout: '10s' })
  check(response, { ok: (r) => r.status === 200 })
}

// Requests a second, answers and latency every 10 s as the rate climbs - where it bends is the
// process's ceiling.
export const handleSummary = (data) => ({
  [`/scripts/results/${__ENV.RUN || 'capacity'}.json`]: JSON.stringify(data, null, 2),
  stdout: `${Math.round(data.metrics.http_reqs.values.rate)} req/s on average, failed ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%, p95 ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms, dropped ${data.metrics.dropped_iterations?.values.count ?? 0}\\n`,
})
