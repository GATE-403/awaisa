import { describe, expect, it } from 'vitest'
import { isBookingPath } from '../lib/bookingPath'

describe('isBookingPath', () => {
  it('is the booking of that place', () => {
    expect(isBookingPath('/brow-bar/book', 'brow-bar')).toBe(true)
    expect(isBookingPath('/brow-bar/book/', 'brow-bar')).toBe(true)
  })

  it('is not any page the client moved on to', () => {
    expect(isBookingPath('/brow-bar', 'brow-bar')).toBe(false)
    expect(isBookingPath('/brow-bar/services', 'brow-bar')).toBe(false)
    expect(isBookingPath('/map', 'brow-bar')).toBe(false)
    expect(isBookingPath('/', 'brow-bar')).toBe(false)
    expect(isBookingPath('/other/book', 'brow-bar')).toBe(false)
  })
})
