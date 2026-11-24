import { describe, expect, it } from 'vitest'
import { achievementsOf, badgesOf, levelOf, type ProfileStats } from './profile-badges.js'

const stats = (overrides: Partial<ProfileStats> = {}): ProfileStats => ({
  visits: 0,
  reviews: 0,
  kinds: 0,
  places: 0,
  topPlace: null,
  earlyVisits: 0,
  firstVisitDaysAgo: null,
  ...overrides,
})

describe('levelOf', () => {
  it('starts at 1 and climbs with visits and reviews', () => {
    expect(levelOf(stats())).toMatchObject({ level: 1, xp: 0, next: 20, progress: 0 })
    // 3 visits + 2 reviews = 60 xp: level 3 (50), a fifth of the way to 100.
    expect(levelOf(stats({ visits: 3, reviews: 2 }))).toMatchObject({
      level: 3,
      xp: 60,
      next: 100,
      progress: 0.2,
    })
    expect(levelOf(stats({ visits: 200 }))).toMatchObject({ level: 10, next: null, progress: 1 })
  })
})

describe('badgesOf', () => {
  it('gives nothing to someone who never came', () => {
    expect(badgesOf(stats())).toEqual([])
  })

  it('earns badges from real visits', () => {
    const ids = badgesOf(
      stats({
        visits: 12,
        reviews: 5,
        kinds: 3,
        places: 5,
        topPlace: { name: 'Kings', visits: 6 },
        earlyVisits: 3,
        firstVisitDaysAgo: 400,
      }),
    ).map((badge) => badge.id)
    expect(ids).toEqual([
      'first-visit',
      'visits-10',
      'regular',
      'explorer',
      'places-5',
      'early-bird',
      'first-review',
      'critic',
      'year',
    ])
    const regular = badgesOf(stats({ visits: 5, topPlace: { name: 'Kings', visits: 5 } })).find(
      (badge) => badge.id === 'regular',
    )
    expect(regular?.title).toBe('A regular at Kings')
  })
})

describe('achievementsOf', () => {
  it('lists every goal with progress, earned or not', () => {
    const list = achievementsOf(
      stats({ visits: 3, places: 2, topPlace: { name: 'Kings', visits: 3 } }),
    )
    expect(list).toHaveLength(12)
    expect(list.find((item) => item.id === 'first-visit')).toMatchObject({ earned: true })
    expect(list.find((item) => item.id === 'regular')).toMatchObject({
      earned: false,
      title: 'Regular',
      progress: { current: 3, target: 5 },
    })
    expect(list.find((item) => item.id === 'visits-10')?.progress).toEqual({
      current: 3,
      target: 10,
    })
  })
})

describe('friends', () => {
  it('count toward points and two achievements', () => {
    expect(levelOf(stats({ friends: 1 })).xp).toBe(30)
    const list = achievementsOf(stats({ friends: 2 }))
    expect(list.find((item) => item.id === 'friend')?.earned).toBe(true)
    expect(list.find((item) => item.id === 'friends-3')?.progress).toEqual({
      current: 2,
      target: 3,
    })
  })
})
