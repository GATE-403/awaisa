// A transparent score instead of a black box: each part adds a little and the strongest part
// becomes the card's reason ('Due again · 5 wk', 'Your pick · nails', 'Nearby · 1.2 km').

/** Every version still served (interleaving compares two of them online). */
const ALGORITHMS = ['score-v1', 'score-v2'] as const
type Algorithm = (typeof ALGORITHMS)[number]

/**
 * The version shelves get. Logged with every event: add a new one whenever the ranking changes,
 * so versions can be compared. score-v2 (docs/recsys/roadmap.md): the client's usual services are
 * a habit, not only a due date; barbershops and kids' services are not shown to people they are
 * not for.
 */
const ALGORITHM: Algorithm = 'score-v2'

type Interest =
  | 'haircut'
  | 'beard'
  | 'coloring'
  | 'nails'
  | 'brows'
  | 'massage'
  | 'face'
  | 'tattoo'
  | 'health'
  | 'waxing'

type Gender = 'male' | 'female'

/** What matters most when choosing ('What matters most', one or several): each counts twice. */
const PRIORITIES = ['near', 'soon', 'rating', 'price'] as const
type Priority = (typeof PRIORITIES)[number]

type Profile = {
  interests: Interest[]
  gender: Gender | null
  /** The most a visit should cost, som; null = any. */
  budget: number | null
  /** What matters most when choosing (one or several); empty = nothing in particular. */
  priorities?: Priority[]
  /** Past visits: service, place, when (from the device and the account). */
  visits: { serviceId: string; slug: string; serviceName: string; daysAgo: number }[]
  /** The service being chosen right now (the booking form): picks follow it before anything. */
  focus?: { serviceId: string; name: string } | null
  /** Services looked at in this session (newest first), after the focus. */
  recent?: { serviceId: string; name: string }[]
  /** «After A people book B»: lift of kind B among clients who had kind A (from bookings). */
  affinities?: Affinities
  /** Times each service was shown to this device lately without a tap. */
  seen?: Record<string, number>
}

type Affinities = Partial<Record<Interest, Partial<Record<Interest, number>>>>

type Candidate = {
  serviceId: string
  name: string
  price: number
  slug: string
  businessName: string
  rating: number | null
  reviews: number
  /** Confirmed bookings of this service in the last 30 days. */
  bookings30d: number
  distanceKm: number | null
  /** Days until the place's first free time: 0 today, 1 tomorrow, null = none soon. */
  freeInDays: number | null
  freeTime: string | null
  discountPercent: number | null
  /** How often clients come back for it, days. */
  rebookDays: number | null
  /** A place without a track record yet: a few shelf spots go to such places. */
  isNewPlace?: boolean
  /** The place's kind (barber, beauty, …): a barbershop's «Стрижка машинкой» (clipper cut) is a men's cut. */
  placeKind?: string
}

const INTEREST_WORDS: Record<Interest, string[]> = {
  haircut: [
    'стриж',
    'укладк',
    'причес',
    'фейд',
    'haircut',
    'hair cut',
    'styling',
    'fade',
    'blow-dry',
  ],
  beard: ['бород', 'брить', 'усы', 'beard', 'shave', 'moustache'],
  coloring: [
    'окраш',
    'тонир',
    'мелир',
    'балаяж',
    'шатуш',
    'блонд',
    'корн',
    'colour',
    'color',
    'toning',
    'highlight',
    'balayage',
    'blonde',
    'roots',
  ],
  nails: ['маникюр', 'педикюр', 'ногт', 'гель', 'manicure', 'pedicure', 'nail', 'gel'],
  brows: ['бров', 'ресниц', 'ламин', 'brow', 'lash', 'lamination'],
  massage: ['массаж', 'spa', 'спа', 'обёрт', 'оберт', 'стоун', 'massage', 'wrap', 'stone'],
  face: [
    'лиц',
    'чистк',
    'пилинг',
    'косметолог',
    'макияж',
    'уход',
    'facial',
    'face',
    'peel',
    'cosmetolog',
    'make-up',
    'makeup',
    'skincare',
  ],
  tattoo: ['тату', 'пирсинг', 'эскиз', 'tattoo', 'piercing'],
  health: [
    'консульт',
    'кинезио',
    'физио',
    'мануал',
    'реабил',
    'осмотр',
    'consult',
    'kinesio',
    'physio',
    'osteopath',
    'rehab',
    'check-up',
  ],
  waxing: ['шугар', 'депиляц', 'эпиляц', 'воск', 'sugaring', 'depil', 'epil', 'wax'],
}

/** The reason on a card for a stated interest: short enough for the card's capsule. */
const INTEREST_LABEL: Record<Interest, string> = {
  haircut: 'Your pick · haircuts',
  beard: 'Your pick · beard',
  coloring: 'Your pick · colour',
  nails: 'Your pick · nails',
  brows: 'Your pick · brows',
  massage: 'Your pick · massage',
  face: 'Your pick · face',
  tattoo: 'Your pick · tattoo',
  health: 'Your pick · health',
  waxing: 'Your pick · waxing',
}

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е')

const interestsOf = (serviceName: string) => {
  const name = normalize(serviceName)
  const found = (Object.keys(INTEREST_WORDS) as Interest[]).filter((interest) =>
    INTEREST_WORDS[interest].some((word) => name.includes(normalize(word))),
  )
  // «Окрашивание бровей» (brow tint) is brows, not hair colouring.
  return found.includes('brows') ? found.filter((interest) => interest !== 'coloring') : found
}

/** Services clearly for the other gender are left out (a men's cut for a woman). */
const fitsGender = (serviceName: string, gender: Gender | null) => {
  if (!gender) return true
  const name = normalize(serviceName)
  if (gender === 'female') return !MALE_WORDS.test(name)
  return !/(женск|маникюр с дизайном|наращ|women|ladies|nail art|extension)/.test(name)
}

/** 'Often booked with manicure': the kind in lower case. */
const INTEREST_WITH: Record<Interest, string> = {
  haircut: 'haircut',
  beard: 'beard trim',
  coloring: 'colouring',
  nails: 'manicure',
  brows: 'brows',
  massage: 'massage',
  face: 'facial',
  tattoo: 'tattoo',
  health: 'consultation',
  waxing: 'waxing',
}

// Men's services by name, Russian (owners name them so) and English.
const MALE_WORDS = /(мужск|бород|брить|усы|\bmen\b|beard|shav|moustache)/
const FEMALE_WORDS =
  /(женск|маникюр|педикюр|бров|ресниц|наращ|депиляц|шугаринг|макияж|women|ladies|manicure|pedicure|brow|lash|extension|depil|sugaring|make-up|makeup)/
const KIDS_WORDS = /(детск|kids|child)/

/** Who a service is for, when its name says so: a manicure leans female, a beard trim male. */
const genderOf = (serviceName: string): Gender | null => {
  const name = normalize(serviceName)
  if (MALE_WORDS.test(name)) return 'male'
  if (FEMALE_WORDS.test(name)) return 'female'
  return null
}

const PRIOR_RATING = 4.3
const PRIOR_WEIGHT = 10

/** Rating pulled toward the average until enough reviews: 5.0 from one review is not a 5.0. */
const trustedRating = (rating: number | null, reviews: number) =>
  rating === null
    ? PRIOR_RATING
    : (rating * reviews + PRIOR_RATING * PRIOR_WEIGHT) / (reviews + PRIOR_WEIGHT)

const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`)

type Scored = { score: number; reason: string; reasons: string[] }

// A habit counts a few days early: people book ahead, and a cut due next week is worth showing.
const HABIT_LOOKAHEAD_DAYS = 7

const scoreCandidate = (
  candidate: Candidate,
  profile: Profile,
  version: Algorithm = ALGORITHM,
): Scored | null => {
  const isV2 = version !== 'score-v1'
  const focus = profile.focus ?? null
  // Without a stated gender, the service being chosen tells who it is for.
  const gender = profile.gender ?? (focus ? genderOf(focus.name) : null)
  if (!fitsGender(candidate.name, gender)) return null
  // A barbershop's clipper cut says nothing about men in its name, but it is a men's cut.
  if (
    isV2 &&
    gender === 'female' &&
    candidate.placeKind === 'barber' &&
    !/(женск|women|ladies)/.test(normalize(candidate.name)) &&
    !KIDS_WORDS.test(normalize(candidate.name))
  ) {
    return null
  }
  // And the other way: evening hairstyles, curls, make-up and nails are not shown to men.
  if (
    isV2 &&
    gender === 'male' &&
    (genderOf(candidate.name) === 'female' ||
      /(причес|локон|образ|updo|curls|bridal)/.test(normalize(candidate.name)))
  ) {
    return null
  }
  if (focus && candidate.serviceId === focus.serviceId) return null
  const parts: { value: number; reason: string }[] = []
  const interests = interestsOf(candidate.name)

  // Kids' services only for someone who has booked for a child or is choosing one now.
  if (isV2 && KIDS_WORDS.test(normalize(candidate.name))) {
    const forKids = [...profile.visits.map((visit) => visit.serviceName), focus?.name ?? ''].some(
      (name) => KIDS_WORDS.test(normalize(name)),
    )
    if (!forKids) parts.push({ value: -4, reason: '' })
  }

  // Choosing a manicure now outweighs a barber visit last month: same kind first, others down.
  if (focus) {
    const focusInterests = interestsOf(focus.name)
    const shared = interests.find((interest) => focusInterests.includes(interest))
    if (shared) parts.push({ value: 4, reason: INTEREST_LABEL[shared] })
    else if (focusInterests.length > 0) parts.push({ value: -3, reason: '' })
    // Near it: another service for the same person (brows beside a manicure, not a kids' cut).
    if (!shared && gender && genderOf(candidate.name) === gender)
      parts.push({ value: 2, reason: '' })
  }

  // Looked at in this session: the same kind again, a little.
  const recentKinds = new Set((profile.recent ?? []).flatMap((item) => interestsOf(item.name)))
  if (!focus && interests.some((interest) => recentKinds.has(interest))) {
    parts.push({ value: 1.5, reason: 'Similar' })
  }

  // 'Often booked with' (Amazon's item-to-item, by kind): what clients book after what this one
  // is choosing or had lately - brows after a manicure, a beard trim after a haircut.
  const sources = new Set([
    ...(focus ? interestsOf(focus.name) : []),
    ...recentKinds,
    ...profile.visits
      .filter((visit) => visit.daysAgo <= 90)
      .flatMap((v) => interestsOf(v.serviceName)),
  ])
  let bestLift = 0
  let bestSource: Interest | null = null
  for (const source of sources) {
    for (const interest of interests) {
      if (sources.has(interest)) continue
      const lift = profile.affinities?.[source]?.[interest] ?? 0
      if (lift > bestLift) {
        bestLift = lift
        bestSource = source
      }
    }
  }
  if (bestSource && bestLift >= 1.3) {
    parts.push({
      value: Math.min(3.5, 1 + (bestLift - 1) * 1.5),
      reason: `Often booked with ${INTEREST_WITH[bestSource]}`,
    })
  }

  // Shown again and again without a tap: step aside for something else (feed fatigue).
  const seen = profile.seen?.[candidate.serviceId] ?? 0
  if (seen > 2) parts.push({ value: -Math.min(seen - 2, 3), reason: '' })

  // Due again: the same service the client had, as long ago as people usually come back.
  const lastSame = profile.visits
    .filter((visit) => visit.serviceId === candidate.serviceId)
    .sort((first, second) => first.daysAgo - second.daysAgo)[0]
  if (lastSame) {
    const cycle = candidate.rebookDays ?? 28
    const weeks = Math.round(lastSame.daysAgo / 7)
    const dueAgain = { value: 5, reason: `Due again · ${Math.max(weeks, 1)} wk` }
    if (!isV2) {
      parts.push(lastSame.daysAgo >= cycle * 0.85 ? dueAgain : { value: -2, reason: '' })
    } else {
      // The usual is a habit: due a week early, held back only right after a visit, and every
      // repeat makes it more likely again (offline: NDCG@10 0.209 → 0.336 on the simulation).
      const times = profile.visits.filter((visit) => visit.serviceId === candidate.serviceId).length
      if (lastSame.daysAgo + HABIT_LOOKAHEAD_DAYS >= cycle * 0.85) parts.push(dueAgain)
      else if (lastSame.daysAgo < HABIT_LOOKAHEAD_DAYS) parts.push({ value: -2, reason: '' })
      else parts.push({ value: 1, reason: '' })
      if (times > 1) parts.push({ value: Math.min(times - 1, 3), reason: 'Your usual' })
    }
  } else if (!focus && profile.visits.some((visit) => visit.slug === candidate.slug)) {
    // While choosing, the choice speaks for now: past places and kinds do not pull picks away.
    parts.push({ value: 1.5, reason: 'Been here' })
  }

  const liked = interests.find((interest) => profile.interests.includes(interest))
  if (liked) parts.push({ value: 3, reason: INTEREST_LABEL[liked] })
  else if (profile.interests.length > 0) parts.push({ value: -1.5, reason: '' })

  // What they actually booked before counts like a stated interest.
  const visitedKinds = new Set(profile.visits.flatMap((visit) => interestsOf(visit.serviceName)))
  if (!focus && !liked && interests.some((interest) => visitedKinds.has(interest))) {
    parts.push({ value: 1.5, reason: 'As usual' })
  }

  if (profile.budget !== null) {
    if (candidate.price <= profile.budget) parts.push({ value: 1, reason: '' })
    else if (candidate.price > profile.budget * 1.3) parts.push({ value: -2.5, reason: '' })
  }

  // Each of the client's priorities counts its part twice; the others stay as they are.
  const priorities = profile.priorities ?? []
  const weight = (key: Priority) => (priorities.includes(key) ? 2 : 1)

  if (candidate.distanceKm !== null) {
    const near = 1 - Math.min(candidate.distanceKm, 10) / 10
    parts.push({
      value: near * 2.5 * weight('near'),
      reason: near > 0.6 ? `Nearby · ${formatKm(candidate.distanceKm)}` : '',
    })
  }

  if (candidate.freeInDays === 0) {
    parts.push({ value: 1.5 * weight('soon'), reason: `Today from ${candidate.freeTime}` })
  } else if (candidate.freeInDays === 1) {
    parts.push({ value: 0.8 * weight('soon'), reason: `Tomorrow from ${candidate.freeTime}` })
  } else {
    parts.push({ value: -1 * weight('soon'), reason: '' })
  }

  const rating = trustedRating(candidate.rating, candidate.reviews)
  parts.push({
    value: (rating - 4) * 2 * weight('rating'),
    reason: rating >= 4.6 ? `Rating ${rating.toFixed(1)}` : '',
  })

  // 'Cheaper': the cheaper, the more it adds (nothing from 5,000 som up).
  if (priorities.includes('price')) {
    parts.push({ value: 2 * (1 - Math.min(candidate.price, 5000) / 5000), reason: '' })
  }
  parts.push({
    value: Math.log1p(candidate.bookings30d) * 0.4,
    reason: candidate.bookings30d >= 20 ? 'Popular' : '',
  })
  if (candidate.discountPercent) {
    parts.push({ value: 0.6, reason: `−${candidate.discountPercent}%` })
  }

  const score = parts.reduce((sum, part) => sum + part.value, 0)
  // Every true reason, strongest first: the shelf picks one per card so neighbours differ.
  const reasons = parts
    .filter((part) => part.reason && part.value > 0)
    .sort((first, second) => second.value - first.value)
    .map((part) => part.reason)
  return { score, reason: reasons[0] ?? 'Popular', reasons }
}

/** Best first, at most `perPlace` from one place and one of each service name, so the shelf
 *  is neither one salon nor the same pedicure from three places. */
const rankCandidates = <T extends Candidate>(
  candidates: T[],
  profile: Profile,
  {
    limit = 12,
    perPlace = 2,
    exploreAt = 3,
    version = ALGORITHM,
  }: { limit?: number; perPlace?: number; exploreAt?: number; version?: Algorithm } = {},
) => {
  const scored = candidates
    .map((candidate) => ({ candidate, ...scoreCandidate(candidate, profile, version) }))
    .filter((entry): entry is { candidate: T } & Scored => typeof entry.score === 'number')
    .sort((first, second) => second.score - first.score)
  const perSlug = new Map<string, number>()
  const names = new Set<string>()
  const result: ({ candidate: T } & Scored)[] = []
  // score-v2: one card per name is the client's own place for a service they had there - a
  // better-rated haircut across town used to push their own salon's off the shelf.
  const ownPlaces = new Map<string, Set<string>>()
  if (version !== 'score-v1') {
    const offered = new Set(scored.map((entry) => entry.candidate.serviceId))
    for (const visit of profile.visits) {
      if (!offered.has(visit.serviceId)) continue
      const name = normalize(visit.serviceName).trim()
      ownPlaces.set(name, (ownPlaces.get(name) ?? new Set<string>()).add(visit.slug))
    }
  }
  for (const entry of scored) {
    const count = perSlug.get(entry.candidate.slug) ?? 0
    const name = normalize(entry.candidate.name).trim()
    if (count >= perPlace || names.has(name)) continue
    if (ownPlaces.get(name)?.has(entry.candidate.slug) === false) continue
    perSlug.set(entry.candidate.slug, count + 1)
    names.add(name)
    result.push(entry)
    if (result.length === limit) break
  }
  // Exploration: one spot near the front goes to a place without a track record, so new salons
  // get seen at all (otherwise the shelf only ever shows what was already popular).
  if (
    exploreAt >= 0 &&
    !result.slice(0, exploreAt + 3).some((entry) => entry.candidate.isNewPlace)
  ) {
    const fresh = scored.find(
      (entry) =>
        entry.candidate.isNewPlace &&
        !result.includes(entry) &&
        !names.has(normalize(entry.candidate.name).trim()) &&
        (perSlug.get(entry.candidate.slug) ?? 0) < perPlace,
    )
    if (fresh && result.length > exploreAt) {
      fresh.reasons = ['New place', ...fresh.reasons]
      result.splice(exploreAt, 0, fresh)
      if (result.length > limit) result.pop()
    }
  }
  // Variety on the shelf: a card says the same as its neighbour or an already common reason only
  // when it has nothing else true to say ('Popular' three times in a row tells nothing).
  const used = new Map<string, number>()
  let previous = ''
  for (const entry of result) {
    const fresh =
      entry.reasons.find((reason) => reason !== previous && (used.get(reason) ?? 0) < 2) ??
      entry.reasons.find((reason) => reason !== previous) ??
      entry.reason
    entry.reason = fresh
    used.set(fresh, (used.get(fresh) ?? 0) + 1)
    previous = fresh
  }
  return result
}

const INTERESTS = Object.keys(INTEREST_WORDS) as Interest[]

const AFFINITY_WINDOW_DAYS = 120
const MIN_SUPPORT = 3

/**
 * Lift of «kind B after kind A»: among clients who had A, the share who booked B within four
 * months, over the share of all clients who booked B. Above 1 = booked together more than chance.
 */
const computeAffinities = (
  visits: { client: string; serviceName: string; time: number }[],
): { from: Interest; to: Interest; lift: number; support: number }[] => {
  const byClient = new Map<string, { kinds: Interest[]; time: number }[]>()
  for (const visit of visits) {
    const kinds = interestsOf(visit.serviceName)
    if (kinds.length === 0) continue
    const list = byClient.get(visit.client) ?? []
    list.push({ kinds, time: visit.time })
    byClient.set(visit.client, list)
  }
  const clients = byClient.size
  if (clients === 0) return []
  const had = new Map<Interest, number>()
  const pairs = new Map<string, number>()
  const window = AFFINITY_WINDOW_DAYS * 86_400_000
  for (const list of byClient.values()) {
    list.sort((first, second) => first.time - second.time)
    for (const kind of new Set(list.flatMap((item) => item.kinds))) {
      had.set(kind, (had.get(kind) ?? 0) + 1)
    }
    const seen = new Set<string>()
    for (const [index, first] of list.entries()) {
      for (const second of list.slice(index + 1)) {
        if (second.time - first.time > window) break
        for (const from of first.kinds) {
          for (const to of second.kinds) {
            if (from === to) continue
            seen.add(`${from}>${to}`)
          }
        }
      }
    }
    for (const key of seen) pairs.set(key, (pairs.get(key) ?? 0) + 1)
  }
  return [...pairs.entries()]
    .map(([key, support]) => {
      const [from, to] = key.split('>') as [Interest, Interest]
      const lift = support / (had.get(from) ?? 1) / ((had.get(to) ?? 0) / clients)
      return { from, to, lift: Math.round(lift * 100) / 100, support }
    })
    .filter((pair) => pair.support >= MIN_SUPPORT)
}

export type { Affinities, Algorithm, Candidate, Gender, Interest, Priority, Profile }
export {
  ALGORITHM,
  ALGORITHMS,
  computeAffinities,
  INTERESTS,
  interestsOf,
  PRIORITIES,
  rankCandidates,
  scoreCandidate,
  trustedRating,
}
