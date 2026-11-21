import { describe, expect, it } from 'vitest'
import {
  clampZoom,
  getDayRange,
  getMasterTint,
  masterDayLoad,
  minorStep,
  pxPerMinute,
} from '../calendarLayout'
import { at, booking, DAY, timeOff } from './fixtures'

// The day range reads a working day; the weekday does not change it.
const WORKING_DAY = { weekday: 0, ...DAY }

describe('getDayRange', () => {
  it('spans the opening hours', () => {
    expect(getDayRange(WORKING_DAY, [], [])).toEqual({ start: at('10:00'), end: at('20:00') })
  })

  it('grows to whole hours around visits and closed time outside the hours', () => {
    const range = getDayRange(WORKING_DAY, [booking('08:30', 45), booking('20:10', 30)], [])
    expect(range).toEqual({ start: at('08:00'), end: at('21:00') })
    expect(getDayRange(WORKING_DAY, [], [timeOff('09:15', '10:30')]).start).toBe(at('09:00'))
  })

  it('never runs past midnight', () => {
    expect(getDayRange(WORKING_DAY, [booking('23:30', 90)], []).end).toBe(24 * 60)
  })

  it('shows 9 to 21 on a day off with nothing on it', () => {
    expect(getDayRange(null, [], [])).toEqual({ start: at('09:00'), end: at('21:00') })
  })
})

describe('masterDayLoad', () => {
  it('a day off is empty and has no free time', () => {
    expect(masterDayLoad(null, [booking('12:00', 60)], null, 30)).toEqual({
      share: 0,
      freeFrom: null,
    })
  })

  it('counts booked minutes inside the hours as a share of the day', () => {
    // 2 of 10 hours, plus the half hour of a visit that starts before opening.
    const load = masterDayLoad(DAY, [booking('12:00', 120), booking('09:30', 60)], null, 30)
    expect(load.share).toBeCloseTo(2.5 / 10)
  })

  it('leaves cancelled visits out', () => {
    const load = masterDayLoad(DAY, [booking('10:00', 600, { status: 'cancelled' })], null, 30)
    expect(load).toEqual({ share: 0, freeFrom: at('10:00') })
  })

  it('finds the first free slot after back-to-back visits from opening', () => {
    const visits = [booking('10:00', 60), booking('11:00', 30), booking('13:00', 60)]
    expect(masterDayLoad(DAY, visits, null, 30).freeFrom).toBe(at('11:30'))
  })

  it('looks from now, rounded up to the slot grid, on today', () => {
    expect(masterDayLoad(DAY, [], at('14:07'), 30).freeFrom).toBe(at('14:30'))
    // A visit running now pushes the free time past its end.
    expect(masterDayLoad(DAY, [booking('14:00', 90)], at('14:07'), 30).freeFrom).toBe(at('15:30'))
  })

  it('a gap shorter than one slot is not free time', () => {
    const visits = [booking('10:00', 60), booking('11:15', 60)]
    expect(masterDayLoad(DAY, visits, null, 30).freeFrom).toBe(at('12:15'))
  })

  it('says «занят до конца дня» when no slot fits before closing', () => {
    expect(masterDayLoad(DAY, [booking('10:00', 600)], null, 30)).toEqual({
      share: 1,
      freeFrom: null,
    })
    expect(masterDayLoad(DAY, [], at('19:45'), 30).freeFrom).toBeNull()
  })
})

describe('timeline zoom', () => {
  it('the columns keep one scale; the timeline scales with the zoom', () => {
    expect(pxPerMinute('columns', 3)).toBe(1.6)
    expect(pxPerMinute('timeline')).toBe(4)
    expect(pxPerMinute('timeline', 2)).toBe(8)
  })

  it('halves appear from 1.75×, quarters from 3×, never on the columns', () => {
    expect(minorStep('timeline', 1.5)).toBeNull()
    expect(minorStep('timeline', 1.75)).toBe(30)
    expect(minorStep('timeline', 3)).toBe(15)
    expect(minorStep('columns', 4)).toBeNull()
  })

  it('stays between the whole day and quarter hours', () => {
    expect(clampZoom(0.2)).toBe(1)
    expect(clampZoom(2.5)).toBe(2.5)
    expect(clampZoom(9)).toBe(4)
  })
})

describe('getMasterTint', () => {
  it('gives each master a colour and starts over after the seventh', () => {
    expect(getMasterTint(0)).toBe('var(--system-blue)')
    expect(getMasterTint(1)).not.toBe(getMasterTint(0))
    expect(getMasterTint(7)).toBe(getMasterTint(0))
  })
})
