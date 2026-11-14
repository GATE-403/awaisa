import { describe, expect, it } from 'vitest'
import { scrubText, scrubUrl } from './error-scrub.js'

describe('error scrubbing', () => {
  it('drops phones however they are written', () => {
    expect(scrubText('No client +996 555 123 456 or 0555123456')).toBe(
      'No client [phone] or [phone]',
    )
  })

  it('drops codes and other long numbers but keeps short ones', () => {
    expect(scrubText('code 111111 failed after 3 tries on line 42')).toBe(
      'code [number] failed after 3 tries on line 42',
    )
  })

  it('keeps the path and drops the query', () => {
    expect(scrubUrl('/bookings/abc-1/review?s=deadbeef&phone=%2B996555')).toBe(
      '/bookings/abc-1/review',
    )
  })
})
