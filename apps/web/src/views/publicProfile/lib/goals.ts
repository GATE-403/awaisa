import type { PublicProfile } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'
import { pluralize } from '@/shared/lib/plural'

// «Следующая цель» on one's own profile: which medal is closest, what is left and where to go
// for it (pure, unit-tested in `tests/goals.test.ts`).

type Achievement = PublicProfile['achievements'][number]
type Place = PublicProfile['places'][number]

type Goal = {
  achievement: Achievement
  /** «Ещё 1 визит в Тепло». */
  hint: string
  /** Where the next step is; null when there is nothing to tap (a friend joining, a year). */
  action: { label: string; href: string } | null
}

/** Goals no tap brings nearer: time alone does it. */
const PASSIVE = new Set(['year'])

/** The unearned medal closest to done (the largest share, then the fewest left). */
const pickNextGoal = (items: Achievement[]) =>
  items
    .filter((item) => !item.earned && !PASSIVE.has(item.id) && item.progress.target > 0)
    .sort((first, second) => {
      const share =
        second.progress.current / second.progress.target -
        first.progress.current / first.progress.target
      if (share !== 0) return share
      const left = (item: Achievement) => item.progress.target - item.progress.current
      return left(first) - left(second)
    })[0] ?? null

/** What is left and where to go for it; `t` translates (Russian without it, for tests). */
const describeGoal = (achievement: Achievement, places: Place[], t?: Translate): Goal => {
  const say = (text: string, vars?: Record<string, string | number>) =>
    t ? t(text, vars) : text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars?.[key] ?? ''))
  const count = (value: number, forms: [string, string, string]) =>
    t ? t.count(value, forms) : pluralize(value, forms)
  const left = Math.max(1, achievement.progress.target - achievement.progress.current)
  const book = { label: say('Записаться'), href: '/' }
  const top = places[0]

  switch (achievement.id) {
    case 'regular':
      return {
        achievement,
        hint: top
          ? say('Ещё {visits} в {place}', {
              visits: count(left, ['визит', 'визита', 'визитов']),
              place: top.name,
            })
          : say('Ещё {visits} в одно место', {
              visits: count(left, ['визит', 'визита', 'визитов']),
            }),
        action: top ? { label: say('Записаться'), href: `/${top.slug}/book` } : book,
      }
    case 'explorer':
      return {
        achievement,
        hint: say('Попробуйте ещё {kinds}', {
          kinds: count(left, ['вид услуг', 'вида услуг', 'видов услуг']),
        }),
        action: book,
      }
    case 'places-5':
      return {
        achievement,
        hint: say('Ещё {places}', {
          places: count(left, ['новое место', 'новых места', 'новых мест']),
        }),
        action: { label: say('На карте'), href: '/map' },
      }
    case 'early-bird':
      return {
        achievement,
        hint: say('Ещё {visits} до 10:00', {
          visits: count(left, ['визит', 'визита', 'визитов']),
        }),
        action: book,
      }
    case 'first-review':
    case 'critic':
      return {
        achievement,
        hint: say('Ещё {reviews}', { reviews: count(left, ['отзыв', 'отзыва', 'отзывов']) }),
        action: { label: say('Оценить'), href: '#profile-reviews' },
      }
    case 'friend':
    case 'friends-3':
      return {
        achievement,
        hint: say('Ещё {friends} по вашей ссылке', {
          friends: count(left, ['друг', 'друга', 'друзей']),
        }),
        action: null,
      }
    default:
      return {
        achievement,
        hint: say('Ещё {visits}', { visits: count(left, ['визит', 'визита', 'визитов']) }),
        action: book,
      }
  }
}

export type { Goal }
export { describeGoal, pickNextGoal }
