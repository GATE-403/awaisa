import { type Interest, interestsOf } from '../../../apps/api/src/recommendations/recommend-score.ts'
import { mulberry32, pick, type Random } from '../lib/random.ts'
import type { Dataset, Item, Review, StatedPreferences, Visit } from '../types.ts'
import { DAY_MS } from './split.ts'

// A behaviour simulation over the real catalog. The demo seed books a random service at a place
// for every visit, so there is nothing in it for a recommender to find. Here clients have tastes
// (1–3 kinds), their own rhythm per kind, a usual place they mostly return to, a budget, and
// they sometimes book a second kind after the first (brows after nails, a beard after a cut).
//
// It is a model of people, not people: whatever it assumes, a model that uses the same idea
// will look good on it. Read its numbers as «does the framework see a signal when there is
// one» and «which variant uses the signals better», never as the quality the app will have.

type Gender = 'male' | 'female'

const START = Date.UTC(2026, 6, 1)
const DAYS = 120

// How often people come back for a kind, days (a person's own rhythm varies around it).
const CYCLE: Record<Interest, number> = {
  haircut: 28,
  beard: 21,
  coloring: 60,
  nails: 21,
  brows: 35,
  massage: 40,
  face: 45,
  tattoo: 150,
  health: 90,
}

const TASTES: Record<Gender, [Interest, number][]> = {
  female: [
    ['nails', 0.28],
    ['brows', 0.18],
    ['haircut', 0.18],
    ['coloring', 0.1],
    ['face', 0.1],
    ['massage', 0.08],
    ['health', 0.05],
    ['tattoo', 0.03],
  ],
  male: [
    ['haircut', 0.45],
    ['beard', 0.28],
    ['massage', 0.08],
    ['health', 0.12],
    ['tattoo', 0.07],
  ],
}

// After a visit of one kind, the chance of booking another within two weeks.
const CROSS_SELL: [Interest, Interest, number][] = [
  ['haircut', 'beard', 0.2],
  ['nails', 'brows', 0.15],
  ['coloring', 'haircut', 0.3],
  ['face', 'massage', 0.15],
  ['massage', 'face', 0.1],
  ['health', 'massage', 0.1],
]

const FOR_MEN_ONLY = /(мужск|бород|брить|усы)/
const FOR_WOMEN_ONLY =
  /(женск|маникюр|педикюр|бров|ресниц|наращ|депиляц|эпиляц|шугаринг|бикини|макияж|образ|локон|причес|причёс)/

const fits = (item: Item, gender: Gender) => {
  const name = item.name.toLowerCase()
  return gender === 'female' ? !FOR_MEN_ONLY.test(name) : !FOR_WOMEN_ONLY.test(name)
}

const weighted = <T>(random: Random, entries: [T, number][]): T => {
  const total = entries.reduce((acc, [, weight]) => acc + weight, 0)
  let roll = random() * total
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll <= 0) return value
  }
  return (entries.at(-1) as [T, number])[0]
}

type Client = {
  id: string
  gender: Gender
  budget: number | null
  tastes: Interest[]
  cycle: Partial<Record<Interest, number>>
  usual: Partial<Record<Interest, Item>>
  joinedDay: number
  churn: number
}

const simulate = (catalog: Item[], { clients = 4000, seed = 7 } = {}): Dataset => {
  const random = mulberry32(seed)
  const places = [...new Set(catalog.map((item) => item.businessId))]
  // Some places are simply better: more chosen, better rated (the long tail real catalogs have).
  const quality = new Map(places.map((id) => [id, Math.exp((random() - 0.5) * 1.6)]))
  const byInterest = new Map<Interest, Item[]>()
  for (const item of catalog) {
    for (const interest of interestsOf(item.name)) {
      const list = byInterest.get(interest) ?? []
      list.push(item)
      byInterest.set(interest, list)
    }
  }

  const choose = (client: Client, interest: Interest, except?: Item) => {
    const options = (byInterest.get(interest) ?? []).filter(
      (item) => fits(item, client.gender) && item !== except,
    )
    if (options.length === 0) return null
    return weighted(
      random,
      options.map((item) => {
        const tooDear = client.budget !== null && item.price > client.budget * 1.3
        return [item, (quality.get(item.businessId) ?? 1) * (tooDear ? 0.15 : 1)]
      }),
    )
  }

  const people: Client[] = Array.from({ length: clients }, (_, index) => {
    const gender: Gender = random() < 0.6 ? 'female' : 'male'
    const count = 1 + Math.floor(random() * random() * 3)
    const tastes: Interest[] = []
    while (tastes.length < count) {
      const taste = weighted(random, TASTES[gender])
      if (!tastes.includes(taste)) tastes.push(taste)
    }
    const budgetRoll = random()
    return {
      id: `sim-${index.toString(36)}`,
      gender,
      budget: budgetRoll < 0.35 ? 1000 : budgetRoll < 0.7 ? 2500 : null,
      tastes,
      cycle: Object.fromEntries(
        tastes.map((taste) => [taste, Math.round(CYCLE[taste] * (0.7 + random() * 0.7))]),
      ),
      usual: {},
      joinedDay: Math.floor(random() * DAYS),
      churn: 0.08 + random() * 0.2,
    }
  })

  const visits: Visit[] = []
  const reviews: Review[] = []
  const book = (client: Client, item: Item, day: number) => {
    const time = START + day * DAY_MS + (9 + Math.floor(random() * 10)) * 3_600_000
    visits.push({ client: client.id, serviceId: item.serviceId, time, isNoShow: random() < 0.04 })
    if (random() < 0.15) {
      const base = 3.6 + (quality.get(item.businessId) ?? 1) * 0.6
      const rating = Math.max(1, Math.min(5, Math.round(base + (random() - 0.5) * 1.5)))
      reviews.push({ businessId: item.businessId, rating, time: time + DAY_MS })
    }
  }

  for (const client of people) {
    // The first visit of each taste comes some time after joining, then on the person's rhythm.
    for (const taste of client.tastes) {
      const cycle = client.cycle[taste] ?? CYCLE[taste]
      let day = client.joinedDay + Math.floor(random() * Math.min(cycle, 30))
      while (day < DAYS) {
        // Mostly the usual service at the usual place; one visit in four tries another, and
        // sometimes that one becomes the new usual.
        let item = client.usual[taste] ?? choose(client, taste)
        if (!item) break
        client.usual[taste] ??= item
        if (random() < 0.25) {
          const other = choose(client, taste, item)
          if (other) {
            item = other
            if (random() < 0.3) client.usual[taste] = other
          }
        }
        book(client, item, day)
        for (const [from, to, chance] of CROSS_SELL) {
          if (from !== taste || random() >= chance) continue
          const extra = choose(client, to)
          if (extra) book(client, extra, day + Math.floor(random() * 14))
        }
        if (random() < client.churn / 3) break
        day += Math.max(3, Math.round(cycle * (0.8 + random() * 0.45)))
      }
    }
    // Now and then something new: a service of another kind, picked like everyone picks.
    if (random() < 0.15) {
      const other = pick(random, catalog)
      if (fits(other, client.gender)) {
        book(client, other, client.joinedDay + Math.floor(random() * (DAYS - client.joinedDay)))
      }
    }
  }

  const stated: Record<string, StatedPreferences> = {}
  for (const client of people) {
    if (random() < 0.3) {
      stated[client.id] = { interests: client.tastes, gender: client.gender, budget: client.budget }
    }
  }

  const horizon = START + DAYS * DAY_MS
  return {
    source: 'sim',
    note:
      'Симуляция поведения поверх реального каталога: вкусы, свой ритм, привычное место, бюджет, «после А берут Б». Модель людей, а не люди.',
    items: catalog,
    visits: visits.filter((visit) => visit.time < horizon).sort((a, b) => a.time - b.time),
    reviews,
    stated,
  }
}

export { simulate }
