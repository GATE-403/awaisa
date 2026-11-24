import { msg, plural } from '@lingui/core/macro'
import type { PublicProfile } from '@/shared/api/types'
import type { Translate } from '@/shared/i18n'

// «Next goal» on one's own profile: which medal is closest, what is left and where to go
// for it (pure, unit-tested in `tests/goals.test.ts`).

type Achievement = PublicProfile['achievements'][number]
type Place = PublicProfile['places'][number]

type Goal = {
  achievement: Achievement
  /** «1 visit more at Teplo». */
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

/** What is left and where to go for it, in the page's language. */
const describeGoal = (achievement: Achievement, places: Place[], t: Translate): Goal => {
  const left = Math.max(1, achievement.progress.target - achievement.progress.current)
  const book = { label: t(msg`Book`), href: '/' }
  const top = places[0]

  switch (achievement.id) {
    case 'regular': {
      if (!top) {
        return {
          achievement,
          hint: t(
            msg`${plural(left, { one: '# visit more to one place', other: '# visits more to one place' })}`,
          ),
          action: book,
        }
      }
      const place = top.name
      return {
        achievement,
        hint: t(
          msg`${plural(left, { one: `# visit more at ${place}`, other: `# visits more at ${place}` })}`,
        ),
        action: { label: t(msg`Book`), href: `/${top.slug}/book` },
      }
    }
    case 'explorer':
      return {
        achievement,
        hint: t(
          msg`${plural(left, { one: 'Try # kind of service more', other: 'Try # kinds of service more' })}`,
        ),
        action: book,
      }
    case 'places-5':
      return {
        achievement,
        hint: t(msg`${plural(left, { one: '# new place more', other: '# new places more' })}`),
        action: { label: t(msg`On the map`), href: '/map' },
      }
    case 'early-bird':
      return {
        achievement,
        hint: t(
          msg`${plural(left, { one: '# visit more before 10:00', other: '# visits more before 10:00' })}`,
        ),
        action: book,
      }
    case 'first-review':
    case 'critic':
      return {
        achievement,
        hint: t(msg`${plural(left, { one: '# review more', other: '# reviews more' })}`),
        action: { label: t(msg`Rate`), href: '#profile-reviews' },
      }
    case 'friend':
    case 'friends-3':
      return {
        achievement,
        hint: t(
          msg`${plural(left, { one: '# friend more by your link', other: '# friends more by your link' })}`,
        ),
        action: null,
      }
    default:
      return {
        achievement,
        hint: t(msg`${plural(left, { one: '# visit more', other: '# visits more' })}`),
        action: book,
      }
  }
}

export type { Goal }
export { describeGoal, pickNextGoal }
