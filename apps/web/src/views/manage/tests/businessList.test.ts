import { describe, expect, it } from 'vitest'
import type { BusinessAttention, BusinessLink } from '@/shared/api/types'
import {
  attentionItems,
  filterBusinesses,
  isOwnBusiness,
  sortBusinesses,
  statusLine,
  todaySummary,
  weekSummary,
} from '@/views/manage/lib/businessList'
import { t } from './translator'

const business = (slug: string, name: string, role: BusinessLink['role'] = 'owner') =>
  ({
    slug,
    name,
    kind: 'barber',
    isPublished: true,
    coverUrl: null,
    logoUrl: null,
    role,
    todayCount: 0,
    next: null,
  }) satisfies BusinessLink

const quiet = (slug: string): BusinessAttention => ({
  slug,
  unmarkedVisits: 0,
  unansweredReviews: 0,
  failedReceipts: 0,
  todayRevenue: null,
  todayLoad: null,
  setup: { done: 3, total: 3, next: null },
  week: { views: 0, previousViews: 0, bookings: 0, previousBookings: 0 },
})

describe('attentionItems', () => {
  it('names only what waits, each with its tab', () => {
    expect(
      attentionItems({ ...quiet('a'), unmarkedVisits: 3, failedReceipts: 1 }, t).map(
        ({ text, tab }) => [text, tab],
      ),
    ).toEqual([
      ['3 visits unmarked', 'schedule'],
      ['1 receipt failed', 'fiscal'],
    ])
    expect(attentionItems({ ...quiet('a'), failedReceipts: 2 }, t)[0]?.text).toBe(
      '2 receipts failed',
    )
    expect(attentionItems({ ...quiet('a'), unansweredReviews: 5 }, t)[0]?.text).toBe(
      '5 reviews unanswered',
    )
  })

  it('draws nothing for zero or before the counts arrive', () => {
    expect(attentionItems(quiet('a'), t)).toEqual([])
    expect(attentionItems(undefined, t)).toEqual([])
  })
})

describe('sortBusinesses', () => {
  const list = [business('a', 'A'), business('b', 'B'), business('c', 'C'), business('d', 'D')]

  it('puts what waits first, then the lately opened, then the rest in their order', () => {
    const attention = new Map([['c', { ...quiet('c'), unansweredReviews: 1 }]])
    expect(sortBusinesses(list, attention, ['d']).map(({ slug }) => slug)).toEqual([
      'c',
      'd',
      'a',
      'b',
    ])
  })

  it('keeps the API order with nothing known', () => {
    expect(sortBusinesses(list, new Map(), []).map(({ slug }) => slug)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })
})

describe('filterBusinesses', () => {
  const list = [business('kings-barbershop', 'Kings Barbershop'), business('alatoo', 'Ала-Тоо SPA')]

  it('finds by any part of the name or the address, ignoring case', () => {
    expect(filterBusinesses(list, 'barber').map(({ slug }) => slug)).toEqual(['kings-barbershop'])
    expect(filterBusinesses(list, 'ала').map(({ slug }) => slug)).toEqual(['alatoo'])
    expect(filterBusinesses(list, 'alat').map(({ slug }) => slug)).toEqual(['alatoo'])
  })

  it('returns everything for an empty query', () => {
    expect(filterBusinesses(list, '  ')).toHaveLength(2)
  })
})

describe('isOwnBusiness', () => {
  it('tells a platform admin’s own businesses from the rest', () => {
    expect(isOwnBusiness(business('a', 'A', 'owner'))).toBe(true)
    expect(isOwnBusiness(business('b', 'B', 'staff'))).toBe(true)
    expect(isOwnBusiness(business('c', 'C', 'admin'))).toBe(false)
  })
})

describe('todaySummary', () => {
  const day = '2026-11-23'
  const list = [
    { ...business('a', 'Boroda'), todayCount: 5, next: { date: day, time: '14:30' } },
    { ...business('b', 'Brow Bar'), todayCount: 3, next: { date: day, time: '11:00' } },
    { ...business('c', 'Kans'), todayCount: 0, next: { date: '2026-11-24', time: '09:00' } },
  ]

  it('adds up the visits and the money, and names the soonest visit of today', () => {
    const attention = new Map([
      ['a', { ...quiet('a'), todayRevenue: 6000 }],
      ['b', { ...quiet('b'), todayRevenue: 2500 }],
    ])
    expect(todaySummary(list, attention, day)).toEqual({
      visits: 8,
      revenue: 8500,
      next: { time: '11:00', name: 'Brow Bar' },
    })
  })

  it('has no money for an administrator and no next visit after the last one', () => {
    const late = list.map((item) => ({ ...item, next: null }))
    expect(todaySummary(late, new Map(), day)).toEqual({ visits: 8, revenue: null, next: null })
  })
})

describe('statusLine', () => {
  it('names the step left before clients can book, even on a busy row', () => {
    const attention = { ...quiet('a'), setup: { done: 2, total: 3, next: 'masters' as const } }
    expect(statusLine(attention, false, t)).toEqual({
      kind: 'setup',
      done: 2,
      total: 3,
      text: 'Add specialists',
      tab: 'masters',
    })
  })

  it('says nothing more on a ready row that has a visit ahead or something waiting', () => {
    expect(statusLine(quiet('a'), false, t)).toBeNull()
  })

  it('gives a quiet ready row its week, going up or down by bookings', () => {
    const week = { views: 40, previousViews: 50, bookings: 3, previousBookings: 1 }
    expect(statusLine({ ...quiet('a'), week }, true, t)).toEqual({
      kind: 'week',
      views: 40,
      bookings: 3,
      trend: 'up',
    })
  })

  it('goes by views when there were no bookings in either week', () => {
    const week = { views: 4, previousViews: 9, bookings: 0, previousBookings: 0 }
    expect(statusLine({ ...quiet('a'), week }, true, t)).toMatchObject({ trend: 'down' })
  })

  it('asks to share the page when nobody has come yet, unless it is hidden', () => {
    expect(statusLine(quiet('a'), true, t)).toEqual({ kind: 'share' })
    expect(statusLine(quiet('a'), true, t, false)).toBeNull()
  })
})

describe('weekSummary', () => {
  it('adds up the week over the businesses in view', () => {
    const attention = new Map([
      [
        'a',
        { ...quiet('a'), week: { views: 10, previousViews: 0, bookings: 2, previousBookings: 0 } },
      ],
      [
        'b',
        { ...quiet('b'), week: { views: 5, previousViews: 0, bookings: 1, previousBookings: 0 } },
      ],
    ])
    expect(weekSummary([business('a', 'A'), business('b', 'B')], attention)).toEqual({
      views: 15,
      bookings: 3,
    })
  })
})
