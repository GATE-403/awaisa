import { describe, expect, it } from 'vitest'
import { waitlistGroupKey } from './waitlist-visit.js'

const entry = {
  serviceId: 'brows',
  extraServiceIds: [] as string[],
  specialistId: null,
  branchId: null,
  date: '2026-11-23',
}

describe('waitlistGroupKey', () => {
  it('keeps a visit of two services apart from its first service alone', () => {
    expect(waitlistGroupKey({ ...entry, extraServiceIds: ['lamination'] })).not.toBe(
      waitlistGroupKey(entry),
    )
  })

  it('groups the same visit on the same day together', () => {
    expect(waitlistGroupKey({ ...entry, extraServiceIds: ['lamination'] })).toBe(
      waitlistGroupKey({ ...entry, extraServiceIds: ['lamination'] }),
    )
  })
})
