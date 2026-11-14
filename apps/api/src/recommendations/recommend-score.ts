// A transparent score instead of a black box: each part adds a little and the strongest part
// becomes the card's reason («Пора снова», «Вы любите маникюр», «Рядом · 1,2 км»).

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

type Gender = 'male' | 'female'

type Profile = {
  interests: Interest[]
  gender: Gender | null
  /** The most a visit should cost, сом; null = any. */
  budget: number | null
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
}

const INTEREST_WORDS: Record<Interest, string[]> = {
  haircut: ['стриж', 'укладк', 'причес', 'фейд'],
  beard: ['бород', 'брить', 'усы'],
  coloring: ['окраш', 'тонир', 'мелир', 'балаяж', 'шатуш', 'блонд', 'корн'],
  nails: ['маникюр', 'педикюр', 'ногт', 'гель'],
  brows: ['бров', 'ресниц', 'ламин'],
  massage: ['массаж', 'spa', 'спа', 'обёрт', 'оберт', 'стоун'],
  face: ['лиц', 'чистк', 'пилинг', 'косметолог', 'макияж', 'уход'],
  tattoo: ['тату', 'пирсинг', 'эскиз'],
  health: ['консульт', 'кинезио', 'физио', 'мануал', 'реабил', 'осмотр'],
}

/** The reason on a card for a stated interest: short enough for the card's capsule. */
const INTEREST_LABEL: Record<Interest, string> = {
  haircut: 'Ваш выбор · стрижки',
  beard: 'Ваш выбор · борода',
  coloring: 'Ваш выбор · цвет',
  nails: 'Ваш выбор · ногти',
  brows: 'Ваш выбор · брови',
  massage: 'Ваш выбор · массаж',
  face: 'Ваш выбор · лицо',
  tattoo: 'Ваш выбор · тату',
  health: 'Ваш выбор · здоровье',
}

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е')

const interestsOf = (serviceName: string) => {
  const name = normalize(serviceName)
  const found = (Object.keys(INTEREST_WORDS) as Interest[]).filter((interest) =>
    INTEREST_WORDS[interest].some((word) => name.includes(normalize(word))),
  )
  // «Окрашивание бровей» is brows, not hair colouring.
  return found.includes('brows') ? found.filter((interest) => interest !== 'coloring') : found
}

/** Services clearly for the other gender are left out («Мужская стрижка» for «женщина»). */
const fitsGender = (serviceName: string, gender: Gender | null) => {
  if (!gender) return true
  const name = normalize(serviceName)
  if (gender === 'female') return !/(мужск|бород|брить|усы)/.test(name)
  return !/(женск|маникюр с дизайном|наращ)/.test(name)
}

/** «Часто берут с маникюром»: the kind in the instrumental case. */
const INTEREST_WITH: Record<Interest, string> = {
  haircut: 'со стрижкой',
  beard: 'с бородой',
  coloring: 'с окрашиванием',
  nails: 'с маникюром',
  brows: 'с бровями',
  massage: 'с массажем',
  face: 'с уходом за лицом',
  tattoo: 'с тату',
  health: 'с консультацией',
}

/** Who a service is for, when its name says so: «Маникюр» leans female, «Борода» male. */
const genderOf = (serviceName: string): Gender | null => {
  const name = normalize(serviceName)
  if (/(мужск|бород|брить|усы)/.test(name)) return 'male'
  if (/(женск|маникюр|педикюр|бров|ресниц|наращ|депиляц|шугаринг|макияж)/.test(name))
    return 'female'
  return null
}

const PRIOR_RATING = 4.3
const PRIOR_WEIGHT = 10

/** Rating pulled toward the average until enough reviews: 5.0 from one review is not a 5.0. */
const trustedRating = (rating: number | null, reviews: number) =>
  rating === null
    ? PRIOR_RATING
    : (rating * reviews + PRIOR_RATING * PRIOR_WEIGHT) / (reviews + PRIOR_WEIGHT)

const formatKm = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1).replace('.', ',')} км`

type Scored = { score: number; reason: string; reasons: string[] }

const scoreCandidate = (candidate: Candidate, profile: Profile): Scored | null => {
  const focus = profile.focus ?? null
  // Without a stated gender, the service being chosen tells who it is for.
  const gender = profile.gender ?? (focus ? genderOf(focus.name) : null)
  if (!fitsGender(candidate.name, gender)) return null
  if (focus && candidate.serviceId === focus.serviceId) return null
  const parts: { value: number; reason: string }[] = []
  const interests = interestsOf(candidate.name)

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
    parts.push({ value: 1.5, reason: 'Похоже на просмотренное' })
  }

  // «С этим часто берут» (Amazon's item-to-item, by kind): what clients book after what this one
  // is choosing or had lately — brows after a manicure, a beard trim after a haircut.
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
      reason: `Часто берут ${INTEREST_WITH[bestSource]}`,
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
    parts.push(
      lastSame.daysAgo >= cycle * 0.85
        ? { value: 5, reason: `Пора снова · ${weeks > 1 ? `${weeks} нед.` : 'неделя'}` }
        : { value: -2, reason: '' },
    )
  } else if (!focus && profile.visits.some((visit) => visit.slug === candidate.slug)) {
    // While choosing, the choice speaks for now: past places and kinds do not pull picks away.
    parts.push({ value: 1.5, reason: 'Вы были здесь' })
  }

  const liked = interests.find((interest) => profile.interests.includes(interest))
  if (liked) parts.push({ value: 3, reason: INTEREST_LABEL[liked] })
  else if (profile.interests.length > 0) parts.push({ value: -1.5, reason: '' })

  // What they actually booked before counts like a stated interest.
  const visitedKinds = new Set(profile.visits.flatMap((visit) => interestsOf(visit.serviceName)))
  if (!focus && !liked && interests.some((interest) => visitedKinds.has(interest))) {
    parts.push({ value: 1.5, reason: 'Как в ваших визитах' })
  }

  if (profile.budget !== null) {
    if (candidate.price <= profile.budget) parts.push({ value: 1, reason: '' })
    else if (candidate.price > profile.budget * 1.3) parts.push({ value: -2.5, reason: '' })
  }

  if (candidate.distanceKm !== null) {
    const near = 1 - Math.min(candidate.distanceKm, 10) / 10
    parts.push({
      value: near * 2.5,
      reason: near > 0.6 ? `Рядом · ${formatKm(candidate.distanceKm)}` : '',
    })
  }

  if (candidate.freeInDays === 0) {
    parts.push({ value: 1.5, reason: `Сегодня с ${candidate.freeTime}` })
  } else if (candidate.freeInDays === 1) {
    parts.push({ value: 0.8, reason: `Завтра с ${candidate.freeTime}` })
  } else {
    parts.push({ value: -1, reason: '' })
  }

  const rating = trustedRating(candidate.rating, candidate.reviews)
  parts.push({
    value: (rating - 4) * 2,
    reason: rating >= 4.6 ? `Рейтинг ${rating.toFixed(1).replace('.', ',')}` : '',
  })
  parts.push({
    value: Math.log1p(candidate.bookings30d) * 0.4,
    reason: candidate.bookings30d >= 20 ? 'Часто выбирают' : '',
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
  return { score, reason: reasons[0] ?? 'Популярно', reasons }
}

/** Best first, at most `perPlace` from one place and one of each service name, so the shelf
 *  is neither one salon nor the same pedicure from three places. */
const rankCandidates = <T extends Candidate>(
  candidates: T[],
  profile: Profile,
  { limit = 12, perPlace = 2, exploreAt = 3 } = {},
) => {
  const scored = candidates
    .map((candidate) => ({ candidate, ...scoreCandidate(candidate, profile) }))
    .filter((entry): entry is { candidate: T } & Scored => typeof entry.score === 'number')
    .sort((first, second) => second.score - first.score)
  const perSlug = new Map<string, number>()
  const names = new Set<string>()
  const result: ({ candidate: T } & Scored)[] = []
  for (const entry of scored) {
    const count = perSlug.get(entry.candidate.slug) ?? 0
    const name = normalize(entry.candidate.name).trim()
    if (count >= perPlace || names.has(name)) continue
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
      fresh.reasons = ['Новое место', ...fresh.reasons]
      result.splice(exploreAt, 0, fresh)
      if (result.length > limit) result.pop()
    }
  }
  // Variety on the shelf: a card says the same as its neighbour or an already common reason only
  // when it has nothing else true to say («Часто выбирают» three times in a row tells nothing).
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

export type { Affinities, Candidate, Gender, Interest, Profile }
export { computeAffinities, INTERESTS, interestsOf, rankCandidates, scoreCandidate, trustedRating }
