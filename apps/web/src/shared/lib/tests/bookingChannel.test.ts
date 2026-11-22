import { describe, expect, it } from 'vitest'
import { channelForPage } from '../bookingChannel'

describe('channelForPage', () => {
  it('names the discovery pages whenever they open', () => {
    expect(channelForPage('/', false)).toBe('catalog')
    expect(channelForPage('/feed', true)).toBe('feed')
    expect(channelForPage('/map', false)).toBe('map')
  })

  it('takes a place opened first as the salon’s own link', () => {
    expect(channelForPage('/old-school', true)).toBe('salon_link')
    expect(channelForPage('/old-school/book', true)).toBe('salon_link')
  })

  it('keeps the channel when a place is reached from inside the site', () => {
    expect(channelForPage('/old-school', false)).toBeNull()
    expect(channelForPage('/bookings', false)).toBeNull()
  })

  it('calls any other first page other', () => {
    expect(channelForPage('/bookings', true)).toBe('other')
    expect(channelForPage('/top', true)).toBe('other')
  })
})
