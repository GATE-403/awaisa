import { describe, expect, it } from 'vitest'
import { getSlugProblem } from '../businesses/business-rules.js'
import { ARCHIVED_SLUG_PREFIX, archivedSlug, bookingsToCancel } from './business-erasure.js'

const now = new Date('2026-11-23T10:00:00Z')
const id = '3f2b8c1e-7a4d-4e0b-9c55-0123456789ab'

describe('archivedSlug', () => {
  it('moves the business to an address of its own, within the column', () => {
    const slug = archivedSlug(id, now)
    expect(slug.startsWith(ARCHIVED_SLUG_PREFIX)).toBe(true)
    expect(slug).toContain('3f2b8c1e7a4d')
    expect(slug.length).toBeLessThanOrEqual(48)
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('is an address nobody can register', () => {
    expect(getSlugProblem(archivedSlug(id, now))).toBe('Этот адрес занят')
    expect(getSlugProblem('deleted-shop')).toBe('Этот адрес занят')
  })

  it('never repeats for the same business deleted twice', () => {
    expect(archivedSlug(id, now)).not.toBe(archivedSlug(id, new Date(now.getTime() + 1)))
  })
})

describe('bookingsToCancel', () => {
  it('cancels only confirmed visits that have not started', () => {
    expect(
      bookingsToCancel(
        [
          { id: 'ahead', status: 'confirmed', startsAt: new Date('2026-11-24T10:00:00Z') },
          { id: 'past', status: 'confirmed', startsAt: new Date('2026-11-22T10:00:00Z') },
          { id: 'started', status: 'confirmed', startsAt: now },
          { id: 'cancelled', status: 'cancelled', startsAt: new Date('2026-11-25T10:00:00Z') },
        ],
        now,
      ),
    ).toEqual(['ahead'])
  })

  it('has nothing to cancel without visits', () => {
    expect(bookingsToCancel([], now)).toEqual([])
  })
})
