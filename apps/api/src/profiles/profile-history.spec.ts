import { describe, expect, it } from 'vitest'
import { activityOf, earnedDatesOf, type HistoryVisit } from './profile-history.js'

const visit = (iso: string, slug = 'old-school', overrides: Partial<HistoryVisit> = {}) => ({
  at: new Date(iso),
  slug,
  businessName: slug,
  serviceName: 'Стрижка',
  masterName: 'Эрлан',
  kinds: ['haircut'],
  isEarly: false,
  ...overrides,
})

const achievement = (id: string, target: number, earned = true) => ({
  id,
  earned,
  progress: { target },
})

describe('activityOf', () => {
  it('gives twelve months up to now, oldest first, counting visits by Bishkek month', () => {
    const months = activityOf(
      [
        visit('2026-11-02T06:00:00Z'),
        // 22:00 UTC on 31 October is 04:00 on 1 November in Bishkek.
        visit('2026-10-31T22:00:00Z'),
        visit('2026-03-10T06:00:00Z'),
        visit('2025-10-10T06:00:00Z'),
      ],
      new Date('2026-11-23T06:00:00Z'),
      true,
    )
    expect(months).toHaveLength(12)
    expect(months[0]?.month).toBe('2025-12')
    expect(months.at(-1)).toMatchObject({ month: '2026-11', visits: 2 })
    expect(months.find((month) => month.month === '2026-03')?.visits).toBe(1)
    expect(months.reduce((sum, month) => sum + month.visits, 0)).toBe(3)
  })

  it('lists a few visits per month, newest first, and none when places are private', () => {
    const visits = Array.from({ length: 6 }, (_, index) => visit(`2026-11-0${index + 1}T06:00:00Z`))
    const [shown] = activityOf(visits, new Date('2026-11-23T06:00:00Z'), true).slice(-1)
    expect(shown?.items).toHaveLength(4)
    expect(shown?.items[0]?.date).toBe('2026-11-06')
    const [hidden] = activityOf(visits, new Date('2026-11-23T06:00:00Z'), false).slice(-1)
    expect(hidden).toMatchObject({ visits: 6, items: [] })
  })
})

describe('earnedDatesOf', () => {
  it('dates each achievement by the visit that reached its target', () => {
    const visits = [
      visit('2026-01-01T06:00:00Z', 'a', { isEarly: true }),
      visit('2026-02-01T06:00:00Z', 'b', { kinds: ['nails'] }),
      visit('2026-03-01T06:00:00Z', 'a', { kinds: ['massage'] }),
    ]
    const dates = earnedDatesOf(
      visits,
      [new Date('2026-02-05T06:00:00Z')],
      [
        achievement('first-visit', 1),
        achievement('explorer', 3),
        achievement('first-review', 1),
        achievement('visits-10', 10, false),
        achievement('friend', 1),
      ],
    )
    expect(dates).toEqual({
      'first-visit': '2026-01-01T06:00:00.000Z',
      explorer: '2026-03-01T06:00:00.000Z',
      'first-review': '2026-02-05T06:00:00.000Z',
      'visits-10': null,
      friend: null,
    })
  })

  it('dates «regular» by the fifth visit to one place and «year» a year after the first', () => {
    const visits = [
      ...Array.from({ length: 4 }, (_, index) => visit(`2025-0${index + 1}-01T06:00:00Z`, 'a')),
      visit('2025-06-01T06:00:00Z', 'b'),
      visit('2025-07-01T06:00:00Z', 'a'),
    ]
    const dates = earnedDatesOf(visits, [], [achievement('regular', 5), achievement('year', 365)])
    expect(dates.regular).toBe('2025-07-01T06:00:00.000Z')
    expect(dates.year).toBe('2026-01-01T06:00:00.000Z')
  })
})
