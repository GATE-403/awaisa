import type { Context, Dataset, User, Visit } from '../types.ts'

// A split by time, never by random rows: everything a recommender may see (history, popularity,
// ratings, affinities) comes from before the cutoff, and what it is judged against is what each
// client booked after it. A random split would let next week's visits leak into this week's
// popularity and make every model look better than it is.

const DAY_MS = 86_400_000

type Split = {
  cutoff: number
  testDays: number
  context: Context
  train: Visit[]
  /** Clients who came in the test window, each with what they booked there. */
  cases: { user: User; relevant: Set<string> }[]
}

const splitByTime = (dataset: Dataset, testDays: number): Split => {
  const visits = dataset.visits.filter((visit) => !visit.isNoShow)
  const last = Math.max(...visits.map((visit) => visit.time))
  const cutoff = last - testDays * DAY_MS
  const train = visits.filter((visit) => visit.time < cutoff)
  const test = visits.filter((visit) => visit.time >= cutoff)

  const demand30d = new Map<string, number>()
  const popularity = new Map<string, number>()
  for (const visit of train) {
    popularity.set(visit.serviceId, (popularity.get(visit.serviceId) ?? 0) + 1)
    if (visit.time >= cutoff - 30 * DAY_MS) {
      demand30d.set(visit.serviceId, (demand30d.get(visit.serviceId) ?? 0) + 1)
    }
  }

  const ratingSums = new Map<string, { sum: number; count: number }>()
  for (const review of dataset.reviews) {
    if (review.time >= cutoff) continue
    const entry = ratingSums.get(review.businessId) ?? { sum: 0, count: 0 }
    entry.sum += review.rating
    entry.count += 1
    ratingSums.set(review.businessId, entry)
  }
  const rating = new Map(
    [...ratingSums.entries()].map(([id, { sum, count }]) => [
      id,
      { average: count ? Math.round((sum / count) * 10) / 10 : null, count },
    ]),
  )

  const byId = new Map(dataset.items.map((item) => [item.serviceId, item]))
  const context: Context = {
    now: cutoff,
    items: dataset.items,
    byId,
    demand30d,
    popularity,
    rating,
    affinityVisits: train
      .filter((visit) => visit.time >= cutoff - 180 * DAY_MS && byId.has(visit.serviceId))
      .map((visit) => ({
        client: visit.client,
        serviceName: byId.get(visit.serviceId)?.name ?? '',
        time: visit.time,
      })),
  }

  const history = new Map<string, { serviceId: string; time: number }[]>()
  for (const visit of train) {
    const list = history.get(visit.client) ?? []
    list.push({ serviceId: visit.serviceId, time: visit.time })
    history.set(visit.client, list)
  }
  const relevant = new Map<string, Set<string>>()
  for (const visit of test) {
    if (!byId.has(visit.serviceId)) continue
    const set = relevant.get(visit.client) ?? new Set<string>()
    set.add(visit.serviceId)
    relevant.set(visit.client, set)
  }
  const cases = [...relevant.entries()].map(([client, set]) => ({
    user: {
      client,
      history: (history.get(client) ?? []).sort((first, second) => second.time - first.time),
      stated: dataset.stated?.[client] ?? null,
    },
    relevant: set,
  }))
  return { cutoff, testDays, context, train, cases }
}

export type { Split }
export { DAY_MS, splitByTime }
