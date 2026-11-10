import { businessDateTimeToUtc } from '../common/business-time.js'
import { clampToWindow, offHoursAsBusy } from './master-hours.js'

const WINDOW = { opensMinutes: 10 * 60, closesMinutes: 20 * 60 }
const DATE = '2026-11-12'
const at = (minutes: number) => businessDateTimeToUtc(DATE, minutes)

describe('master hours', () => {
  it('a day off blocks the whole business day', () => {
    expect(offHoursAsBusy('m1', DATE, WINDOW, null)).toEqual([
      { specialistId: 'm1', startsAt: at(600), endsAt: at(1200) },
    ])
  })

  it('a later start and an earlier end block both edges', () => {
    expect(offHoursAsBusy('m1', DATE, WINDOW, { opensMinutes: 720, closesMinutes: 1080 })).toEqual([
      { specialistId: 'm1', startsAt: at(600), endsAt: at(720) },
      { specialistId: 'm1', startsAt: at(1080), endsAt: at(1200) },
    ])
  })

  it('hours covering the whole window block nothing', () => {
    expect(offHoursAsBusy('m1', DATE, WINDOW, { opensMinutes: 540, closesMinutes: 1260 })).toEqual(
      [],
    )
  })

  it('hours outside the business window mean a day off', () => {
    expect(clampToWindow({ opensMinutes: 1260, closesMinutes: 1320 }, WINDOW)).toBeNull()
  })
})
