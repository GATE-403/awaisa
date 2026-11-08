import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  parseTime,
  toBusinessParts,
  weekdayOf,
} from './business-time.js'

describe('business time (UTC+6)', () => {
  it('converts business local time to UTC', () => {
    expect(businessDateTimeToUtc('2026-11-08', 10 * 60).toISOString()).toBe(
      '2026-11-08T04:00:00.000Z',
    )
  })

  it('reads the business date across the UTC midnight boundary', () => {
    expect(toBusinessParts(new Date('2026-11-08T20:30:00Z'))).toEqual({
      dateKey: '2026-11-09',
      minutes: 2 * 60 + 30,
    })
  })

  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('formats and parses HH:MM', () => {
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05')
    expect(parseTime('14:30')).toBe(14 * 60 + 30)
  })
})

describe('weekdayOf', () => {
  it('counts from Monday', () => {
    expect(weekdayOf('2026-11-09')).toBe(0)
    expect(weekdayOf('2026-11-15')).toBe(6)
  })
})
