import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readSavedFeed, saveFeed, toGoogleCalendar, toWebcal } from '../lib/feedLinks'

const store = new Map<string, string>()
const URL = 'https://awaisa.kg/api/calendar/abc.ics'

beforeEach(() => {
  store.clear()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  })
})

describe('feed links', () => {
  it('turns the address into a calendar subscription', () => {
    expect(toWebcal(URL)).toBe('webcal://awaisa.kg/api/calendar/abc.ics')
    expect(toWebcal('http://localhost:3001/api/calendar/abc.ics')).toBe(
      'webcal://localhost:3001/api/calendar/abc.ics',
    )
  })

  it('fills Google Calendar’s “Add by URL”', () => {
    expect(toGoogleCalendar(URL)).toBe(
      'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fawaisa.kg%2Fapi%2Fcalendar%2Fabc.ics',
    )
  })
})

describe('saved feeds', () => {
  const scope = { kind: 'master', slug: 'old-school' } as const

  it('gives back the address made on this device while it is the current one', () => {
    saveFeed(scope, { url: URL, createdAt: '2026-11-21T10:00:00.000Z' })

    expect(readSavedFeed(scope, '2026-11-21T10:00:00.000Z')).toBe(URL)
    expect(readSavedFeed({ ...scope, kind: 'business' }, '2026-11-21T10:00:00.000Z')).toBeNull()
  })

  it('forgets an address replaced elsewhere or switched off', () => {
    saveFeed(scope, { url: URL, createdAt: '2026-11-21T10:00:00.000Z' })

    expect(readSavedFeed(scope, '2026-11-22T08:00:00.000Z')).toBeNull()
    expect(readSavedFeed(scope, null)).toBeNull()
  })
})
