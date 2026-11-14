// Badges and a level from real visits, like Discord's profile badges: earned, never bought.
// Pure and unit-tested; the service feeds it numbers from bookings and reviews.

type ProfileStats = {
  visits: number
  reviews: number
  /** Kinds of services tried (haircut, nails, massage…). */
  kinds: number
  places: number
  /** The most visits at one place, and that place's name. */
  topPlace: { name: string; visits: number } | null
  /** Visits that started before 10:00. */
  earlyVisits: number
  /** Days since the first visit; null = none yet. */
  firstVisitDaysAgo: number | null
  /** Friends invited by this client who have come for a visit. */
  friends?: number
}

type Badge = { id: string; title: string; description: string }

const LEVEL_XP = [0, 20, 50, 100, 180, 300, 450, 650, 900, 1200]

const xpOf = (stats: ProfileStats) =>
  stats.visits * 10 + stats.reviews * 15 + (stats.friends ?? 0) * 30

const levelOf = (stats: ProfileStats) => {
  const xp = xpOf(stats)
  const index = LEVEL_XP.findLastIndex((threshold) => xp >= threshold)
  const level = index + 1
  const current = LEVEL_XP[index] ?? 0
  const next = LEVEL_XP[index + 1] ?? null
  return {
    level,
    xp,
    next,
    progress: next === null ? 1 : Math.round(((xp - current) / (next - current)) * 100) / 100,
  }
}

type Achievement = Badge & {
  earned: boolean
  /** Toward it: where the client is and what it takes. */
  progress: { current: number; target: number }
}

// Every achievement with its goal, like 2GIS's: earned ones in colour, the rest as goals with
// progress («3 из 5»), so the profile always says what is next.
const achievementsOf = (stats: ProfileStats): Achievement[] => {
  const top = stats.topPlace
  const defs: {
    id: string
    title: string
    description: string
    current: number
    target: number
  }[] = [
    {
      id: 'first-visit',
      title: 'Первый визит',
      description: 'Записаться и прийти',
      current: stats.visits,
      target: 1,
    },
    {
      id: 'visits-10',
      title: '10 визитов',
      description: 'Десять визитов через Awaisa',
      current: stats.visits,
      target: 10,
    },
    {
      id: 'visits-25',
      title: '25 визитов',
      description: 'Четверть сотни визитов',
      current: stats.visits,
      target: 25,
    },
    {
      id: 'regular',
      title: top && top.visits >= 5 ? `Свой в ${top.name}` : 'Постоянный гость',
      description: '5 визитов в одно место',
      current: top?.visits ?? 0,
      target: 5,
    },
    {
      id: 'explorer',
      title: 'Исследователь',
      description: 'Попробовать 3 вида услуг',
      current: stats.kinds,
      target: 3,
    },
    {
      id: 'places-5',
      title: 'Знает город',
      description: 'Побывать в 5 местах',
      current: stats.places,
      target: 5,
    },
    {
      id: 'early-bird',
      title: 'Ранняя пташка',
      description: '3 визита до 10:00',
      current: stats.earlyVisits,
      target: 3,
    },
    {
      id: 'first-review',
      title: 'Первый отзыв',
      description: 'Рассказать, как прошло',
      current: stats.reviews,
      target: 1,
    },
    {
      id: 'critic',
      title: 'Критик',
      description: '5 отзывов о визитах',
      current: stats.reviews,
      target: 5,
    },
    {
      id: 'friend',
      title: 'Привёл друга',
      description: 'Друг пришёл по вашей ссылке',
      current: stats.friends ?? 0,
      target: 1,
    },
    {
      id: 'friends-3',
      title: 'Душа компании',
      description: 'Три друга по вашей ссылке',
      current: stats.friends ?? 0,
      target: 3,
    },
    {
      id: 'year',
      title: 'Год с нами',
      description: 'Год с первого визита',
      current: Math.min(stats.firstVisitDaysAgo ?? 0, 365),
      target: 365,
    },
  ]
  return defs.map(({ current, target, ...badge }) => ({
    ...badge,
    earned: current >= target,
    progress: { current: Math.min(current, target), target },
  }))
}

const badgesOf = (stats: ProfileStats): Badge[] =>
  achievementsOf(stats)
    .filter((achievement) => achievement.earned)
    .map(({ id, title, description }) => ({ id, title, description }))

export type { Achievement, Badge, ProfileStats }
export { achievementsOf, badgesOf, LEVEL_XP, levelOf, xpOf }
