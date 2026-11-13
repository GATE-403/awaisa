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
}

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
  if (!fitsGender(candidate.name, profile.gender)) return null
  const parts: { value: number; reason: string }[] = []
  const interests = interestsOf(candidate.name)

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
  } else if (profile.visits.some((visit) => visit.slug === candidate.slug)) {
    parts.push({ value: 1.5, reason: 'Вы были здесь' })
  }

  const liked = interests.find((interest) => profile.interests.includes(interest))
  if (liked) parts.push({ value: 3, reason: INTEREST_LABEL[liked] })
  else if (profile.interests.length > 0) parts.push({ value: -1.5, reason: '' })

  // What they actually booked before counts like a stated interest.
  const visitedKinds = new Set(profile.visits.flatMap((visit) => interestsOf(visit.serviceName)))
  if (!liked && interests.some((interest) => visitedKinds.has(interest))) {
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
  { limit = 12, perPlace = 2 } = {},
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

export type { Candidate, Gender, Interest, Profile }
export { INTERESTS, interestsOf, rankCandidates, scoreCandidate, trustedRating }
