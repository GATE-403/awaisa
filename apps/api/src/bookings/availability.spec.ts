import { businessDateTimeToUtc } from '../common/business-time.js'
import { buildSlots } from './availability.js'

const DATE = '2026-11-10'
const BEFORE_OPENING = businessDateTimeToUtc(DATE, 8 * 60)

const DAY = {
  dateKey: DATE,
  window: { opensMinutes: 10 * 60, closesMinutes: 20 * 60 },
  slotMinutes: 30,
}

const at = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return businessDateTimeToUtc(DATE, hours * 60 + minutes)
}

describe('buildSlots', () => {
  it('only offers slots where the whole service fits before closing', () => {
    const slots = buildSlots({
      ...DAY,
      now: BEFORE_OPENING,
      durationMinutes: 90,
      specialistIds: ['a'],
      busy: [],
    })

    expect(slots[0]?.time).toBe('10:00')
    expect(slots.at(-1)?.time).toBe('18:30')
    expect(slots.every((slot) => slot.isAvailable)).toBe(true)
  })

  it('blocks slots that overlap an existing booking', () => {
    const slots = buildSlots({
      ...DAY,
      now: BEFORE_OPENING,
      durationMinutes: 60,
      specialistIds: ['a'],
      busy: [{ specialistId: 'a', startsAt: at('12:00'), endsAt: at('13:00') }],
    })
    const byTime = Object.fromEntries(slots.map((slot) => [slot.time, slot.isAvailable]))

    expect(byTime['11:00']).toBe(true)
    expect(byTime['11:30']).toBe(false)
    expect(byTime['12:30']).toBe(false)
    expect(byTime['13:00']).toBe(true)
  })

  it('falls back to another specialist for "any specialist"', () => {
    const slots = buildSlots({
      ...DAY,
      now: BEFORE_OPENING,
      durationMinutes: 60,
      specialistIds: ['a', 'b'],
      busy: [{ specialistId: 'a', startsAt: at('12:00'), endsAt: at('13:00') }],
    })

    expect(slots.find((slot) => slot.time === '12:00')?.specialistId).toBe('b')
    expect(slots.find((slot) => slot.time === '10:00')?.specialistId).toBe('a')
  })

  it('hides slots in the past and within the lead time', () => {
    const slots = buildSlots({
      ...DAY,
      now: at('13:50'),
      durationMinutes: 30,
      specialistIds: ['a'],
      busy: [],
    })
    const byTime = Object.fromEntries(slots.map((slot) => [slot.time, slot.isAvailable]))

    expect(byTime['13:30']).toBe(false)
    expect(byTime['14:00']).toBe(false)
    expect(byTime['14:30']).toBe(true)
  })

  it('offers nothing on a day off', () => {
    expect(
      buildSlots({
        ...DAY,
        window: null,
        now: BEFORE_OPENING,
        durationMinutes: 30,
        specialistIds: ['a'],
        busy: [],
      }),
    ).toEqual([])
  })

  it('follows the business opening hours and slot step', () => {
    const slots = buildSlots({
      ...DAY,
      window: { opensMinutes: 9 * 60, closesMinutes: 11 * 60 },
      slotMinutes: 15,
      now: BEFORE_OPENING,
      durationMinutes: 60,
      specialistIds: ['a'],
      busy: [],
    })

    expect(slots.map((slot) => slot.time)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00'])
  })
})
