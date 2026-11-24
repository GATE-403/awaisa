import { describe, expect, it } from 'vitest'
import { freeGaps } from '../freeGaps'
import { at, booking, DAY, timeOff } from './fixtures'

const span = (from: string, to: string) => ({ from: at(from), to: at(to) })

describe('freeGaps', () => {
  it('a master who is off has no windows', () => {
    expect(freeGaps({ day: null, bookings: [], timeOff: [], slotMinutes: 30 })).toEqual([])
  })

  it('an empty day is one window from opening to closing', () => {
    expect(freeGaps({ day: DAY, bookings: [], timeOff: [], slotMinutes: 30 })).toEqual([
      span('10:00', '20:00'),
    ])
  })

  it('cuts the day around visits and closed time', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [booking('11:00', 60), booking('15:00', 90)],
      timeOff: [timeOff('13:00', '14:00')],
      slotMinutes: 30,
    })
    expect(gaps).toEqual([
      span('10:00', '11:00'),
      span('12:00', '13:00'),
      span('14:00', '15:00'),
      span('16:30', '20:00'),
    ])
  })

  it('overlapping busy spans do not open a window between them', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [booking('10:00', 120), booking('11:00', 30)],
      timeOff: [],
      slotMinutes: 30,
    })
    expect(gaps).toEqual([span('12:00', '20:00')])
  })

  it('cancelled visits free their time', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [booking('10:00', 600, { status: 'cancelled' })],
      timeOff: [],
      slotMinutes: 30,
    })
    expect(gaps).toEqual([span('10:00', '20:00')])
  })

  it('on today starts from now on the slot grid', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [],
      timeOff: [],
      from: at('13:10'),
      slotMinutes: 15,
    })
    expect(gaps).toEqual([span('13:15', '20:00')])
  })

  it('keeps only windows a service fits in (Find a slot for a service)', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [booking('10:45', 60), booking('12:30', 60)],
      timeOff: [],
      slotMinutes: 15,
      minMinutes: 75,
    })
    // 10:00–10:45 and 11:45–12:30 are too short for 75 minutes.
    expect(gaps).toEqual([span('13:30', '20:00')])
  })

  it('a visit after closing does not count', () => {
    const gaps = freeGaps({
      day: DAY,
      bookings: [booking('20:30', 60)],
      timeOff: [],
      slotMinutes: 30,
    })
    expect(gaps).toEqual([span('10:00', '20:00')])
  })
})
