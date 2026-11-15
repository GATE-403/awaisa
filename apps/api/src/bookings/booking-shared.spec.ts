import { QueryFailedError } from 'typeorm'
import { describe, expect, it } from 'vitest'
import { isOverlapError } from './booking-shared.js'

const failure = (code: string) =>
  new QueryFailedError('INSERT INTO "bookings" …', [], Object.assign(new Error(code), { code }))

describe('isOverlapError', () => {
  it('reads a taken time from the exclusion constraint and from a deadlock between two bookings', () => {
    expect(isOverlapError(failure('23P01'))).toBe(true)
    expect(isOverlapError(failure('40P01'))).toBe(true)
  })

  it('leaves every other failure to be a real error', () => {
    expect(isOverlapError(failure('23505'))).toBe(false)
    expect(isOverlapError(new Error('connection lost'))).toBe(false)
  })
})
