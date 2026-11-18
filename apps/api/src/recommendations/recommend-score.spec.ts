import { describe, expect, it } from 'vitest'
import {
  type Candidate,
  computeAffinities,
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

describe('the service being chosen', () => {
  it('puts the same kind first over past barber visits and leaves men’s services out', () => {
    const focus = { serviceId: 'nails-1', name: 'Маникюр с покрытием' }
    const pastBarber = profile({
      focus,
      visits: [{ serviceId: 'x', slug: 'barber', serviceName: 'Мужская стрижка', daysAgo: 30 }],
    })
    const ranked = rankCandidates(
      [
        candidate({ serviceId: 'nails-1', name: 'Маникюр с покрытием', slug: 'nails' }),
        candidate({ serviceId: 'nails-2', name: 'Педикюр', slug: 'nails' }),
        candidate({ serviceId: 'beard', name: 'Оформление бороды', slug: 'barber' }),
        candidate({ serviceId: 'kids', name: 'Детская стрижка', slug: 'barber' }),
        candidate({ serviceId: 'brows', name: 'Ламинирование бровей', slug: 'brows' }),
      ],
      pastBarber,
    )
    const ids = ranked.map((entry) => entry.candidate.serviceId)
    expect(ids[0]).toBe('nails-2')
    expect(ids).not.toContain('nails-1')
    expect(ids).not.toContain('beard')
    expect(ranked[0]?.reason).toBe('Ваш выбор · ногти')
    expect(ids.indexOf('brows')).toBeLessThan(ids.indexOf('kids'))
  })
})

describe('«С этим часто берут»', () => {
  const day = 86_400_000
  const visit = (client: string, serviceName: string, days: number) => ({
    client,
    serviceName,
    time: days * day,
  })

  it('finds kinds booked after each other more often than chance', () => {
    const visits = [
      // Three nail clients go on to brows; the barber clients never do.
      ...['a', 'b', 'c'].flatMap((client) => [
        visit(client, 'Маникюр с покрытием', 0),
        visit(client, 'Ламинирование бровей', 20),
      ]),
      ...['d', 'e', 'f', 'g'].map((client) => visit(client, 'Мужская стрижка', 0)),
      visit('h', 'Ламинирование бровей', 0),
      // Too far apart to count.
      visit('i', 'Маникюр', 0),
      visit('i', 'Коррекция бровей', 200),
    ]
    const pairs = computeAffinities(visits)
    const nailsToBrows = pairs.find((pair) => pair.from === 'nails' && pair.to === 'brows')
    expect(nailsToBrows?.support).toBe(3)
    // 3 of 4 nail clients vs 5 of 9 clients overall: 0.75 / 0.56.
    expect(nailsToBrows?.lift).toBeCloseTo(1.35, 2)
    // Fewer than three clients: no pair at all.
    expect(pairs.find((pair) => pair.from === 'brows')).toBeUndefined()
  })

  it('gives the related kind a reason and a lift, then steps aside after being ignored', () => {
    const brows = candidate({ serviceId: 'b1', name: 'Ламинирование бровей', slug: 'brows' })
    const withAffinity = profile({
      focus: { serviceId: 'n1', name: 'Маникюр' },
      affinities: { nails: { brows: 2.4 } },
    })
    const plain = scoreCandidate(brows, profile({ focus: { serviceId: 'n1', name: 'Маникюр' } }))
    const lifted = scoreCandidate(brows, withAffinity)
    expect(lifted?.score).toBeGreaterThan(plain?.score ?? 0)
    expect(lifted?.reasons).toContain('Часто берут с маникюром')

    const ignored = scoreCandidate(brows, { ...withAffinity, seen: { b1: 5 } })
    expect(ignored?.score).toBeLessThan(lifted?.score ?? 0)
  })
})

describe('exploration', () => {
  it('gives one early spot to a new place that would have ranked lower', () => {
    const established = Array.from({ length: 8 }, (_, index) =>
      candidate({
        serviceId: `s${index}`,
        name: `Стрижка ${index}`,
        slug: `place-${index}`,
        bookings30d: 40,
      }),
    )
    const fresh = candidate({
      serviceId: 'new',
      name: 'Стрижка новая',
      slug: 'new-place',
      bookings30d: 0,
      reviews: 0,
      rating: null,
      isNewPlace: true,
    })
    const ranked = rankCandidates([...established, fresh], profile(), { limit: 6 })
    const index = ranked.findIndex((entry) => entry.candidate.serviceId === 'new')
    expect(index).toBe(3)
    expect(ranked[index]?.reason).toBe('Новое место')
    expect(ranked).toHaveLength(6)
  })
})

describe('score-v2', () => {
  const visit = (daysAgo: number) => ({
    serviceId: 's1',
    slug: 'barber',
    serviceName: 'Мужская стрижка',
    daysAgo,
  })

  it('counts the usual as due a week early, where score-v1 held it back', () => {
    // A 28-day cycle is due from day 24 (85%); at day 18 it is due within a week.
    const almost = profile({ visits: [visit(18)] })
    expect(scoreCandidate(candidate(), almost, 'score-v1')?.reason).not.toMatch(/^Пора снова/)
    expect(scoreCandidate(candidate(), almost)?.reason).toMatch(/^Пора снова/)
    // Right after a visit it still steps back.
    const fresh = profile({ visits: [visit(3)] })
    expect(scoreCandidate(candidate(), fresh)?.score ?? 0).toBeLessThan(
      scoreCandidate(candidate(), profile())?.score ?? 0,
    )
  })

  it('makes a service booked again and again more likely, saying «Ваше обычное»', () => {
    const once = scoreCandidate(candidate(), profile({ visits: [visit(12)] }))
    const habit = scoreCandidate(
      candidate(),
      profile({ visits: [visit(12), visit(40), visit(70)] }),
    )
    expect(habit?.score ?? 0).toBeGreaterThan(once?.score ?? 0)
    expect(habit?.reasons).toContain('Ваше обычное')
  })

  it('keeps the client’s own place above the same name elsewhere', () => {
    const own = candidate({ serviceId: 'own', slug: 'mine', rating: 4.1, bookings30d: 2 })
    const other = candidate({ serviceId: 'other', slug: 'top', rating: 4.9, bookings30d: 60 })
    const regular = profile({
      visits: [
        { serviceId: 'own', slug: 'mine', serviceName: 'Мужская стрижка', daysAgo: 10 },
        { serviceId: 'own', slug: 'mine', serviceName: 'Мужская стрижка', daysAgo: 38 },
      ],
    })
    const pick = (version: 'score-v1' | 'score-v2') =>
      rankCandidates([other, own], regular, { version }).map((entry) => entry.candidate.serviceId)
    // One card per name: score-v1 kept the other place's cut and dropped the client's own.
    expect(pick('score-v1')).toEqual(['other'])
    expect(pick('score-v2')).toEqual(['own'])
  })

  it('does not show a barbershop’s cuts to women or kids’ cuts to everyone', () => {
    const clipper = candidate({ name: 'Стрижка машинкой', placeKind: 'barber' })
    expect(scoreCandidate(clipper, profile({ gender: 'female' }), 'score-v1')).not.toBeNull()
    expect(scoreCandidate(clipper, profile({ gender: 'female' }))).toBeNull()
    expect(scoreCandidate(clipper, profile({ gender: 'male' }))).not.toBeNull()

    const kids = candidate({ serviceId: 'kids', name: 'Детская стрижка', placeKind: 'barber' })
    const adult = candidate({ serviceId: 'adult', name: 'Стрижка машинкой', placeKind: 'barber' })
    expect(scoreCandidate(kids, profile())?.score ?? 0).toBeLessThan(
      scoreCandidate(adult, profile())?.score ?? 0,
    )
    const parent = profile({
      visits: [{ serviceId: 'kids', slug: 'barber', serviceName: 'Детская стрижка', daysAgo: 40 }],
    })
    expect(scoreCandidate(kids, parent)?.reason).toMatch(/^Пора снова/)
  })
})

describe('score-v2 audience', () => {
  it('does not show evening hairstyles, make-up or nails to men', () => {
    const men = profile({ gender: 'male' })
    for (const name of ['Вечерняя причёска', 'Дневной макияж', 'Педикюр', 'Свадебный образ']) {
      expect(scoreCandidate(candidate({ name }), men, 'score-v1')).not.toBeNull()
      expect(scoreCandidate(candidate({ name }), men)).toBeNull()
    }
    expect(scoreCandidate(candidate({ name: 'Окрашивание корней' }), men)).not.toBeNull()
  })
})
