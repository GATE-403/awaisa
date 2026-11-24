import { setupI18n } from '@lingui/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBackLabel, readCabinetFrom, rememberCabinetFrom } from '../cabinetFrom'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  })
})

describe('rememberCabinetFrom', () => {
  it('keeps the page the business side was entered from, with its query', () => {
    rememberCabinetFrom('/map?kind=barber', '/manage/studio')
    expect(readCabinetFrom()).toBe('/map?kind=barber')
  })

  it('counts /manage and /insights as the business side', () => {
    rememberCabinetFrom('/feed', '/manage')
    expect(readCabinetFrom()).toBe('/feed')
    rememberCabinetFrom('/top', '/insights')
    expect(readCabinetFrom()).toBe('/top')
  })

  it('ignores moves inside the business side and moves elsewhere', () => {
    rememberCabinetFrom('/map', '/manage/studio')
    rememberCabinetFrom('/manage', '/manage/studio?tab=clients')
    rememberCabinetFrom('/', '/bookings')
    expect(readCabinetFrom()).toBe('/map')
  })

  it('never returns to sign-in, the new business form or “What’s new”', () => {
    rememberCabinetFrom('/map', '/manage')
    for (const passage of ['/login?next=/manage', '/business/new', '/updates']) {
      rememberCabinetFrom(passage, '/manage/studio')
    }
    expect(readCabinetFrom()).toBe('/map')
  })

  it('works without storage (private mode)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    })
    expect(() => rememberCabinetFrom('/map', '/manage')).not.toThrow()
    expect(readCabinetFrom()).toBeNull()
  })
})

describe('getBackLabel', () => {
  const i18n = setupI18n({ locale: 'en', messages: { en: {} } })
  const label = (path: string) => i18n._(getBackLabel(path))

  it('names the page “‹” leads to', () => {
    expect(label('/')).toBe('Catalogue')
    expect(label('/map?kind=nails')).toBe('Map')
    expect(label('/bookings')).toBe('Profile')
    expect(label('/awaisa-studio')).toBe('Back')
  })
})
