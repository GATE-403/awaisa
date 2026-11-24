import { describe, expect, it } from 'vitest'
import { describeGoal, pickNextGoal } from '../lib/goals'

const medal = (id: string, current: number, target: number, earned = false) => ({
  id,
  title: id,
  description: '',
  earned,
  progress: { current, target },
})

const places = [{ slug: 'teplo', name: 'Teplo', logoUrl: null, coverUrl: null, visits: 4 }]

describe('pickNextGoal', () => {
  it('takes the unearned medal closest to done', () => {
    const goal = pickNextGoal([
      medal('first-visit', 1, 1, true),
      medal('visits-25', 17, 25),
      medal('regular', 4, 5),
      medal('critic', 0, 5),
    ])
    expect(goal?.id).toBe('regular')
  })

  it('skips the year, which no tap brings nearer, and has nothing when all is earned', () => {
    expect(pickNextGoal([medal('year', 300, 365), medal('critic', 0, 5)])?.id).toBe('critic')
    expect(pickNextGoal([medal('first-visit', 1, 1, true)])).toBeNull()
  })
})

describe('describeGoal', () => {
  it('sends a regular to book again where they go most', () => {
    expect(describeGoal(medal('regular', 4, 5), places)).toMatchObject({
      hint: '1 visit more at Teplo',
      action: { href: '/teplo/book' },
    })
  })

  it('sends a critic to rate, the explorer to the catalog and the friends with no button', () => {
    expect(describeGoal(medal('critic', 3, 5), places)).toMatchObject({
      hint: '2 reviews more',
      action: { href: '#profile-reviews' },
    })
    expect(describeGoal(medal('explorer', 1, 3), places).action?.href).toBe('/')
    expect(describeGoal(medal('friend', 0, 1), places).action).toBeNull()
  })
})
