import { describe, expect, it } from 'vitest'
import { interleavingVerdict, isInterleaved, signTestP, teamDraft } from './interleave.js'
import type { Candidate } from './recommend-score.js'

const card = (id: string, slug = `p-${id}`, name = `Услуга ${id}`): Candidate => ({
  serviceId: id,
  name,
  price: 1000,
  slug,
  businessName: slug,
  rating: null,
  reviews: 0,
  bookings30d: 0,
  distanceKm: null,
  freeInDays: null,
  freeTime: null,
  discountPercent: null,
  rebookDays: null,
})

const ranked = (...ids: string[]) => ids.map((id) => ({ candidate: card(id), reason: id }))

describe('teamDraft', () => {
  it('alternates the two scorers, the first pick by the coin, and skips cards already taken', () => {
    const drafted = teamDraft(
      { algorithm: 'score-v2', ranked: ranked('a', 'b', 'c', 'd') },
      { algorithm: 'score-v1', ranked: ranked('a', 'x', 'b', 'y') },
      4,
      () => 0.1,
    )
    expect(drafted.map((entry) => `${entry.candidate.serviceId}:${entry.algorithm}`)).toEqual([
      'a:score-v2',
      'x:score-v1',
      'b:score-v2',
      'y:score-v1',
    ])
  })

  it('gives each scorer half the cards and keeps the shelf rules', () => {
    const same = (id: string) => ({ candidate: card(id, 'one-place'), reason: '' })
    const drafted = teamDraft(
      { algorithm: 'score-v2', ranked: [same('a'), same('b'), same('c'), ...ranked('d', 'e')] },
      { algorithm: 'score-v1', ranked: ranked('f', 'g', 'h') },
      6,
      () => 0.9,
    )
    expect(drafted).toHaveLength(6)
    expect(drafted.filter((entry) => entry.candidate.slug === 'one-place')).toHaveLength(2)
    const counts = drafted.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.algorithm] = (acc[entry.algorithm] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual({ 'score-v1': 3, 'score-v2': 3 })
  })

  it('fills from the other scorer when one runs out', () => {
    const drafted = teamDraft(
      { algorithm: 'score-v2', ranked: ranked('a') },
      { algorithm: 'score-v1', ranked: ranked('b', 'c', 'd') },
      4,
    )
    expect(drafted.map((entry) => entry.candidate.serviceId).sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('isInterleaved', () => {
  it('is stable per device and takes about the given share', () => {
    const sessions = Array.from({ length: 2000 }, (_, index) => `device-${index}`)
    expect(isInterleaved('device-7', 'score-v1', 30)).toBe(
      isInterleaved('device-7', 'score-v1', 30),
    )
    const share = sessions.filter((session) => isInterleaved(session, 'score-v1', 30)).length / 2000
    expect(share).toBeGreaterThan(0.26)
    expect(share).toBeLessThan(0.34)
    expect(isInterleaved(undefined, 'score-v1', 100)).toBe(false)
  })
})

describe('interleavingVerdict', () => {
  it('counts wins per answer, leaves ties out and tests the split', () => {
    const tallies = [
      { requestId: 'r1', algorithm: 'score-v2', clicks: 2, bookings: 1 },
      { requestId: 'r1', algorithm: 'score-v1', clicks: 0, bookings: 0 },
      { requestId: 'r2', algorithm: 'score-v2', clicks: 1, bookings: 0 },
      { requestId: 'r2', algorithm: 'score-v1', clicks: 1, bookings: 0 },
      { requestId: 'r3', algorithm: 'score-v1', clicks: 1, bookings: 0 },
      { requestId: 'r4', algorithm: 'score-v2', clicks: 0, bookings: 0 },
    ]
    const verdict = interleavingVerdict(tallies, 10)
    expect(verdict.requests).toBe(10)
    expect(verdict.clicks.wins).toEqual({ 'score-v1': 1, 'score-v2': 1 })
    expect(verdict.clicks.ties).toBe(1)
    expect(verdict.bookings.wins).toEqual({ 'score-v1': 0, 'score-v2': 1 })
  })

  it('finds an uneven split unlikely by chance and an even one likely', () => {
    expect(signTestP(50, 50)).toBeCloseTo(1, 5)
    expect(signTestP(60, 40)).toBeCloseTo(0.0455, 3)
    expect(signTestP(0, 0)).toBe(1)
  })
})
