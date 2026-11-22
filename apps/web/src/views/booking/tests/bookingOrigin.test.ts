import { describe, expect, it } from 'vitest'
import { shouldReturnToOrigin } from '../lib/bookingOrigin'

const origin = { slug: 'fade-house', from: '/?kind=barber' }

describe('shouldReturnToOrigin', () => {
  it('goes back over the catalog on a reload of a booking opened there', () => {
    expect(shouldReturnToOrigin(origin, 'fade-house', true)).toBe(true)
  })

  it('leaves a link opened from outside (not a reload) over the place', () => {
    expect(shouldReturnToOrigin(origin, 'fade-house', false)).toBe(false)
  })

  it('ignores what was kept for another place', () => {
    expect(shouldReturnToOrigin(origin, 'old-school', true)).toBe(false)
  })

  it('has nothing to do when the booking was opened over the place itself', () => {
    expect(
      shouldReturnToOrigin({ slug: 'fade-house', from: '/fade-house' }, 'fade-house', true),
    ).toBe(false)
  })

  it('never steps to another site', () => {
    expect(
      shouldReturnToOrigin(
        { slug: 'fade-house', from: 'https://evil.example/' },
        'fade-house',
        true,
      ),
    ).toBe(false)
  })

  it('needs something kept', () => {
    expect(shouldReturnToOrigin(null, 'fade-house', true)).toBe(false)
  })
})
