import { describe, expect, it } from 'vitest'
import { groupWeek } from '../lib/workingHours'

const day = (weekday: number, opens = 600, closes = 1200) => ({
  weekday,
  opensMinutes: opens,
  closesMinutes: closes,
})

describe('groupWeek', () => {
  it('folds a week of the same hours into one run', () => {
    expect(groupWeek([0, 1, 2, 3, 4, 5, 6].map((weekday) => day(weekday)))).toEqual([
      { from: 0, to: 6, range: '10:00–20:00' },
    ])
  })

  it('keeps short days and days off as runs of their own', () => {
    expect(groupWeek([day(0), day(1), day(2), day(3), day(4), day(5, 660, 1080)])).toEqual([
      { from: 0, to: 4, range: '10:00–20:00' },
      { from: 5, to: 5, range: '11:00–18:00' },
      { from: 6, to: 6, range: null },
    ])
  })

  it('is one run of days off when the place has no hours', () => {
    expect(groupWeek([])).toEqual([{ from: 0, to: 6, range: null }])
  })
})
