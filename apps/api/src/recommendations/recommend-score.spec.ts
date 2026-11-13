import { describe, expect, it } from 'vitest'
import {
  type Candidate,
  interestsOf,
  type Profile,
  rankCandidates,
  scoreCandidate,
  trustedRating,
} from './recommend-score.js'

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  serviceId: 's1',
  name: 'Мужская стрижка',
  price: 900,
  slug: 'barber',
  businessName: 'Барбер',
  rating: 4.5,
  reviews: 20,
  bookings30d: 10,
  distanceKm: null,
  freeInDays: 0,
  freeTime: '15:00',
  discountPercent: null,
  rebookDays: 28,
  ...overrides,
})

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  interests: [],
  gender: null,
  budget: null,
  visits: [],
  ...overrides,
})

describe('scoreCandidate', () => {
  it('leaves out services for the other gender', () => {
    expect(scoreCandidate(candidate(), profile({ gender: 'female' }))).toBeNull()
    expect(
      scoreCandidate(candidate({ name: 'Женская стрижка' }), profile({ gender: 'male' })),
    ).toBeNull()
  })

  it('says «Пора снова» when the usual gap has passed, and holds back a fresh repeat', () => {
    const due = scoreCandidate(
      candidate(),
      profile({
        visits: [{ serviceId: 's1', slug: 'barber', serviceName: 'Мужская стрижка', daysAgo: 30 }],
      }),
    )
    const fresh = scoreCandidate(
      candidate(),
      profile({
        visits: [{ serviceId: 's1', slug: 'barber', serviceName: 'Мужская стрижка', daysAgo: 5 }],
      }),
    )
    expect(due?.reason).toMatch(/^Пора снова/)
    expect(due?.score ?? 0).toBeGreaterThan(fresh?.score ?? 0)
  })

  it('stated interests lift matching services and name them', () => {
    const nails = scoreCandidate(
      candidate({ name: 'Маникюр с покрытием' }),
      profile({ interests: ['nails'] }),
    )
    const haircut = scoreCandidate(candidate(), profile({ interests: ['nails'] }))
    expect(nails?.reason).toBe('Ваш выбор · ногти')
    expect(nails?.score ?? 0).toBeGreaterThan(haircut?.score ?? 0)
  })

  it('a budget pushes expensive services down', () => {
    const cheap = scoreCandidate(candidate({ price: 800 }), profile({ budget: 1000 }))
    const dear = scoreCandidate(candidate({ price: 3000 }), profile({ budget: 1000 }))
    expect(cheap?.score ?? 0).toBeGreaterThan(dear?.score ?? 0)
  })
})

describe('interestsOf', () => {
  it('reads brow colouring as brows, not hair colour', () => {
    expect(interestsOf('Окрашивание бровей')).toEqual(['brows'])
    expect(interestsOf('Окрашивание корней')).toEqual(['coloring'])
  })
})

describe('trustedRating', () => {
  it('does not trust a perfect score from one review', () => {
    expect(trustedRating(5, 1)).toBeLessThan(trustedRating(4.7, 200))
  })
})

describe('rankCandidates', () => {
  it('keeps at most two per place and one of each service name', () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      candidate({ serviceId: `s${index}`, name: `Стрижка ${index}` }),
    )
    const other = candidate({ serviceId: 'x', slug: 'other', rating: 3.8 })
    const ranked = rankCandidates([...many, other], profile())
    expect(ranked.filter((entry) => entry.candidate.slug === 'barber')).toHaveLength(2)
    expect(ranked.some((entry) => entry.candidate.slug === 'other')).toBe(true)
    const twins = rankCandidates(
      [candidate({ serviceId: 'a', slug: 'one' }), candidate({ serviceId: 'b', slug: 'two' })],
      profile(),
    )
    expect(twins).toHaveLength(1)
  })
})

describe('rankCandidates reasons', () => {
  it('neighbouring cards say different things when they can', () => {
    const popularAndFree = (index: number) =>
      candidate({
        serviceId: `s${index}`,
        name: `Услуга ${index}`,
        slug: `place-${index}`,
        bookings30d: 40,
        freeInDays: 0,
        freeTime: '15:00',
      })
    const ranked = rankCandidates([1, 2, 3, 4].map(popularAndFree), profile())
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index]?.reason).not.toBe(ranked[index - 1]?.reason)
    }
  })
})
