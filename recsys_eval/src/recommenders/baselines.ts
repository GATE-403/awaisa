import { mulberry32, seedOf, shuffle } from '../lib/random.ts'
import type { Context, Recommender, User } from '../types.ts'

// Yardsticks: a model that cannot beat «the most booked» is not earning its complexity.

const byPopularity = (context: Context) =>
  [...context.items].sort(
    (first, second) =>
      (context.demand30d.get(second.serviceId) ?? 0) -
        (context.demand30d.get(first.serviceId) ?? 0) ||
      (context.popularity.get(second.serviceId) ?? 0) -
        (context.popularity.get(first.serviceId) ?? 0),
  )

const popularCache = new WeakMap<Context, string[]>()
const popularIds = (context: Context) => {
  const cached = popularCache.get(context)
  if (cached) return cached
  const value = byPopularity(context).map((item) => item.serviceId)
  popularCache.set(context, value)
  return value
}

const fill = (first: string[], rest: string[], k: number) => {
  const seen = new Set(first)
  const result = [...first]
  for (const id of rest) {
    if (result.length >= k) break
    if (!seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result.slice(0, k)
}

const random: Recommender = {
  name: 'random',
  description: 'Случайные услуги (нижняя граница).',
  recommend: (user, context, k) =>
    shuffle(
      mulberry32(seedOf(user.client)),
      context.items.map((item) => item.serviceId),
    ).slice(0, k),
}

const popular: Recommender = {
  name: 'popular',
  description: 'Самые записываемые за 30 дней до среза, одинаково для всех.',
  recommend: (_user, context, k) => popularIds(context).slice(0, k),
}

const kindsOf = (user: User, context: Context) => {
  const counts = new Map<string, number>()
  for (const visit of user.history) {
    const kind = context.byId.get(visit.serviceId)?.kind
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [...counts.entries()].sort((first, second) => second[1] - first[1]).map(([kind]) => kind)
}

const popularInCategory: Recommender = {
  name: 'popular-in-category',
  description: 'Популярное в категориях (типе места), где клиент уже бывал; иначе - popular.',
  recommend: (user, context, k) => {
    const kinds = kindsOf(user, context)
    const ranked = popularIds(context)
    const inKinds = kinds.flatMap((kind) =>
      ranked.filter((id) => context.byId.get(id)?.kind === kind),
    )
    return fill(inKinds, ranked, k)
  },
}

const repeatPlaces: Recommender = {
  name: 'repeat-places',
  description:
    'Проверка данных: услуги мест, где клиент уже был (свои - первыми), затем popular. Не кандидат в прод.',
  recommend: (user, context, k) => {
    const own = new Map<string, number>()
    const places = new Set<string>()
    for (const visit of user.history) {
      own.set(visit.serviceId, (own.get(visit.serviceId) ?? 0) + 1)
      const slug = context.byId.get(visit.serviceId)?.slug
      if (slug) places.add(slug)
    }
    const ranked = popularIds(context)
    const mine = [...own.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
    const atPlaces = ranked.filter((id) => places.has(context.byId.get(id)?.slug ?? ''))
    return fill([...mine, ...atPlaces], ranked, k)
  },
}

export { popular, popularIds, popularInCategory, random, repeatPlaces }
