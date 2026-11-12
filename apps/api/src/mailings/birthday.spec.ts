import { daysUntilBirthday } from './mailings.service.js'

describe('days until a birthday', () => {
  it('counts within the year and across the new year', () => {
    expect(daysUntilBirthday('1990-11-12', '2026-11-12')).toBe(0)
    expect(daysUntilBirthday('1990-11-15', '2026-11-12')).toBe(3)
    expect(daysUntilBirthday('1990-01-02', '2026-12-30')).toBe(3)
    expect(daysUntilBirthday('1990-11-10', '2026-11-12')).toBe(363)
  })
})
