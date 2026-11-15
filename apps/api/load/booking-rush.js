// The rush hour: many people press «Записаться» for the same free time at the same moment.
// Exactly one gets it per master; everyone else must get a clean 409 «Это время уже занято»,
// never a 5xx or a double booking. Run: pnpm --filter api load:rush (see load/README.md).
import { check } from 'k6'
import http from 'k6/http'
import { Counter } from 'k6/metrics'

const BASE = __ENV.BASE || 'http://host.docker.internal:4400'
const PEOPLE = Number(__ENV.PEOPLE || 200)
// `one` books one named master; `any` lets the API pick a free master.
const MODE = __ENV.MODE || 'one'

const booked = new Counter('booked')
const taken = new Counter('taken_409')
const broken = new Counter('unexpected')

export const options = {
  scenarios: {
    rush: { executor: 'per-vu-iterations', vus: PEOPLE, iterations: 1, maxDuration: '60s' },
  },
  thresholds: { unexpected: ['count==0'] },
}

const dayKey = (offsetDays) =>
  new Date(Date.now() + 6 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)

// A free time two days ahead at the place with the most masters on one service.
export const setup = () => {
  const date = dayKey(2)
  const places = http.get(`${BASE}/businesses?limit=40`).json()
  let best = null
  for (const place of places) {
    const page = http.get(`${BASE}/businesses/${place.slug}`).json()
    for (const service of page.catalog.services) {
      const masters = page.catalog.specialists.filter((m) => m.serviceIds.includes(service.id))
      if (!best || masters.length > best.masters.length) best = { service, masters }
    }
  }
  const specialistId = MODE === 'any' ? 'any' : best.masters[0].id
  const slots = http
    .get(
      `${BASE}/availability?serviceId=${best.service.id}&specialistId=${specialistId}&date=${date}`,
    )
    .json().slots
  const slot = slots.find((item) => item.isAvailable)
  if (!slot) throw new Error('No free time to rush')
  return {
    serviceId: best.service.id,
    specialistId,
    masters: best.masters.length,
    date,
    time: slot.time,
  }
}

export default ({ serviceId, specialistId, date, time }) => {
  const phone = `+99677${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`
  const response = http.post(
    `${BASE}/bookings`,
    JSON.stringify({
      serviceId,
      specialistId,
      date,
      time,
      name: 'Нагрузка Тест',
      phone,
      smsConfirmation: false,
    }),
    { headers: { 'content-type': 'application/json' }, tags: { name: 'book' } },
  )
  if (response.status === 201) booked.add(1)
  else if (response.status === 409) taken.add(1)
  else broken.add(1, { status: String(response.status) })
  check(response, { 'booked or cleanly refused': (r) => r.status === 201 || r.status === 409 })
}

export const handleSummary = (data) => {
  const count = (name) => data.metrics[name]?.values.count ?? 0
  const lines = [
    `${PEOPLE} people, mode ${MODE}, ${data.setup_data.date} ${data.setup_data.time}, ${data.setup_data.masters} masters on the service`,
    `booked ${count('booked')}, refused with 409 ${count('taken_409')}, unexpected ${count('unexpected')}`,
    `answers p95 ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms, max ${data.metrics.http_req_duration.values.max.toFixed(0)} ms`,
  ]
  return {
    [`/scripts/results/rush-${MODE}.json`]: JSON.stringify(data, null, 2),
    stdout: `${lines.join('\n')}\n`,
  }
}
