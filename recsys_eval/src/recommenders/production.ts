import {
  type Affinities,
  ALGORITHM,
  type Algorithm,
  type Candidate,
  computeAffinities,
  type Interest,
  type Profile,
  rankCandidates,
  scoreCandidate,
} from '../../../apps/api/src/recommendations/recommend-score.ts'
import { DAY_MS } from '../data/split.ts'
import type { Context, Recommender, User } from '../types.ts'

// The production scorer itself, imported from the API (not a copy): the same `rankCandidates`
// GET /recommendations runs, fed with what was known at the cutoff. What the past cannot tell -
// where the client stood, who was free that day, promotions running then - is left empty for
// every candidate alike, so those parts do not move the order here (see the report's caveats).

const NEW_PLACE_REVIEWS = 5
// GET /recommendations reads the account's last 30 visits.
const HISTORY_LIMIT = 30

type CandidateWithKind = Candidate & { kind: string }

const affinityCache = new WeakMap<Context, Affinities>()

const affinitiesAt = (context: Context) => {
  const cached = affinityCache.get(context)
  if (cached) return cached
  const value: Affinities = {}
  for (const pair of computeAffinities(context.affinityVisits)) {
    value[pair.from] = { ...value[pair.from], [pair.to]: pair.lift }
  }
  affinityCache.set(context, value)
  return value
}

const candidateCache = new WeakMap<Context, CandidateWithKind[]>()

const candidatesAt = (context: Context): CandidateWithKind[] => {
  const cached = candidateCache.get(context)
  if (cached) return cached
  const value = context.items.map((item) => {
    const rating = context.rating.get(item.businessId)
    return {
      serviceId: item.serviceId,
      name: item.name,
      price: item.price,
      slug: item.slug,
      businessName: item.businessName,
      kind: item.kind,
      placeKind: item.kind,
      rating: rating?.average ?? null,
      reviews: rating?.count ?? 0,
      bookings30d: context.demand30d.get(item.serviceId) ?? 0,
      distanceKm: null,
      freeInDays: null,
      freeTime: null,
      discountPercent: null,
      rebookDays: item.rebookDays,
      isNewPlace: (rating?.count ?? 0) < NEW_PLACE_REVIEWS,
    }
  })
  candidateCache.set(context, value)
  return value
}

const profileOf = (user: User, context: Context): Profile => ({
  interests: (user.stated?.interests ?? []) as Interest[],
  gender: user.stated?.gender ?? null,
  budget: user.stated?.budget ?? null,
  visits: user.history.slice(0, HISTORY_LIMIT).flatMap((visit) => {
    const item = context.byId.get(visit.serviceId)
    if (!item) return []
    return [
      {
        serviceId: visit.serviceId,
        slug: item.slug,
        serviceName: item.name,
        daysAgo: Math.floor((context.now - visit.time) / DAY_MS),
      },
    ]
  }),
  affinities: affinitiesAt(context),
  seen: {},
})

const productionScored = (
  user: User,
  context: Context,
  limit: number,
  { exploreAt = 3, version = ALGORITHM }: { exploreAt?: number; version?: Algorithm } = {},
) => rankCandidates(candidatesAt(context), profileOf(user, context), { limit, exploreAt, version })

/** Every candidate with its score (no shelf rules yet), for prototypes to adjust. */
const productionScores = (user: User, context: Context, version: Algorithm) => {
  const profile = profileOf(user, context)
  return candidatesAt(context).flatMap((candidate) => {
    const scored = scoreCandidate(candidate, profile, version)
    return scored ? [{ candidate, score: scored.score }] : []
  })
}

const scorer = (version: Algorithm, description: string): Recommender => ({
  name: version,
  description,
  recommend: (user, context, k) =>
    productionScored(user, context, k, { version }).map((entry) => entry.candidate.serviceId),
})

const production = scorer(
  ALGORITHM,
  'Текущая формула «Для вас» (rankCandidates из API) - production.',
)
const previous = scorer(
  'score-v1',
  'Прошлая версия формулы (до 2026-11-18): для сравнения и interleaving.',
)

// A diagnostic, not a candidate: what the exploration spot costs in today's accuracy (its gain -
// new places getting seen at all - only shows online).
const productionNoExplore: Recommender = {
  name: `${ALGORITHM}-no-explore`,
  description: `Диагностика: ${ALGORITHM} без слота «Новое место».`,
  recommend: (user, context, k) =>
    productionScored(user, context, k, { exploreAt: -1 }).map((entry) => entry.candidate.serviceId),
}

export {
  candidatesAt,
  previous,
  production,
  productionNoExplore,
  productionScored,
  productionScores,
  profileOf,
}
