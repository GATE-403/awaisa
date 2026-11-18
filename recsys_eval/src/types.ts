// The shapes every part of the evaluation shares: a catalog, anonymous visits, and one
// interface all recommenders implement, so the production scorer and the baselines are judged
// by the same code on the same split.

type Item = {
  serviceId: string
  name: string
  price: number
  slug: string
  businessId: string
  businessName: string
  /** The place's kind (barber, beauty, nails, spa, health, other): the «category» of a service. */
  kind: string
  rebookDays: number | null
}

type Visit = {
  /** A salted hash of the phone: never the number or the name. */
  client: string
  serviceId: string
  /** Milliseconds since epoch. */
  time: number
  isNoShow: boolean
}

type Review = { businessId: string; rating: number; time: number }

type Dataset = {
  /** Where it came from: `db` (the local demo database) or `sim` (the behaviour simulation). */
  source: 'db' | 'sim'
  note: string
  items: Item[]
  visits: Visit[]
  reviews: Review[]
  /** What clients said in the «Для вас» questionnaire, when they did (simulation only). */
  stated?: Record<string, StatedPreferences>
}

type StatedPreferences = {
  interests: string[]
  gender: 'male' | 'female' | null
  budget: number | null
}

/** One client at the cutoff: only what was known before it. */
type User = {
  client: string
  history: { serviceId: string; time: number }[]
  stated: StatedPreferences | null
}

/** What the world looked like at the cutoff (popularity, ratings, affinities — all before it). */
type Context = {
  now: number
  items: Item[]
  byId: Map<string, Item>
  /** Confirmed visits per service in the 30 days before the cutoff. */
  demand30d: Map<string, number>
  /** Visits per service before the cutoff (for novelty). */
  popularity: Map<string, number>
  rating: Map<string, { average: number | null; count: number }>
  affinityVisits: { client: string; serviceName: string; time: number }[]
}

type Recommender = {
  name: string
  /** A short line for the report: what it does. */
  description: string
  prepare?: (context: Context, train: Visit[]) => void
  recommend: (user: User, context: Context, k: number) => string[]
}

export type { Context, Dataset, Item, Recommender, Review, StatedPreferences, User, Visit }
