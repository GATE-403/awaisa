import { type SegmentedClient, segmentClients } from './client-segments.js'

const NOW = new Date('2026-11-21T08:00:00Z')
const TODAY = '2026-11-21'

const client = (patch: Partial<SegmentedClient>): SegmentedClient => ({
  name: 'Клиент',
  visits: 0,
  noShows: 0,
  spent: 0,
  lastVisit: null,
  nextVisit: null,
  birthday: null,
  ...patch,
})

const ALL = [
  client({ name: 'Асель', visits: 1, spent: 900, lastVisit: '2026-11-10T08:00:00Z' }),
  client({
    name: 'Бакыт',
    visits: 5,
    spent: 7000,
    lastVisit: '2026-11-18T08:00:00Z',
    nextVisit: '2026-11-25T08:00:00Z',
  }),
  client({ name: 'Вика', visits: 3, spent: 3000, lastVisit: '2026-08-01T08:00:00Z' }),
  client({ name: 'Гуля', visits: 2, noShows: 2, spent: 1800, lastVisit: '2026-11-01T08:00:00Z' }),
  client({ name: 'Данияр', nextVisit: '2026-11-23T08:00:00Z', birthday: '1990-11-25' }),
]

describe('client segments', () => {
  it('counts every segment by its rule', () => {
    const { counts } = segmentClients(ALL, 'all', 'recent', NOW, TODAY)
    expect(counts).toEqual({
      all: 5,
      upcoming: 2,
      new: 1,
      regular: 2,
      lapsed: 1,
      noShows: 1,
      birthday: 1,
    })
  })

  it('keeps those with something booked out of «давно не были»', () => {
    const old = client({
      name: 'Ербол',
      visits: 4,
      lastVisit: '2026-06-01T08:00:00Z',
      nextVisit: '2026-12-01T08:00:00Z',
    })
    expect(segmentClients([old], 'lapsed', 'recent', NOW, TODAY).items).toEqual([])
  })

  it('finds birthdays across the new year within a week', () => {
    const late = client({ name: 'Жанна', birthday: '1995-01-02' })
    const { items } = segmentClients(
      [late],
      'birthday',
      'recent',
      new Date('2026-12-28T08:00:00Z'),
      '2026-12-28',
    )
    expect(items).toHaveLength(1)
  })

  it('orders by the latest visit (never came last), by money, by visits and by name', () => {
    const names = (sort: 'recent' | 'spent' | 'visits' | 'name') =>
      segmentClients(ALL, 'all', sort, NOW, TODAY).items.map((item) => item.name)
    expect(names('recent')).toEqual(['Бакыт', 'Асель', 'Гуля', 'Вика', 'Данияр'])
    expect(names('spent')).toEqual(['Бакыт', 'Вика', 'Гуля', 'Асель', 'Данияр'])
    expect(names('visits')).toEqual(['Бакыт', 'Вика', 'Гуля', 'Асель', 'Данияр'])
    expect(names('name')).toEqual(['Асель', 'Бакыт', 'Вика', 'Гуля', 'Данияр'])
  })
})
