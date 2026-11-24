import { describe, expect, it } from 'vitest'
import { localizePath, pickLocale, splitLocale } from '../locales'

describe('pickLocale', () => {
  it('takes the first of our languages in the order the browser prefers them', () => {
    expect(pickLocale('ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('ru')
    expect(pickLocale('ky-KG, ru;q=0.9, en;q=0.8')).toBe('ky')
    expect(pickLocale('en-GB,en;q=0.9,ru;q=0.8')).toBe('en')
  })

  it('ranks by quality, not by where a language stands in the header', () => {
    expect(pickLocale('en;q=0.5, ru;q=0.9')).toBe('ru')
    expect(pickLocale('de-DE, ky;q=0.3, ru;q=0.2')).toBe('ky')
  })

  it('falls back to English for none of ours, nothing sent, or a refused language', () => {
    expect(pickLocale('de-DE,fr;q=0.8')).toBe('en')
    expect(pickLocale(null)).toBe('en')
    expect(pickLocale('')).toBe('en')
    expect(pickLocale('ru;q=0, de')).toBe('en')
  })
})

describe('language in the address', () => {
  it('reads and writes the prefix, leaving English bare', () => {
    expect(splitLocale('/ru/map?kind=barber')).toEqual({ locale: 'ru', path: '/map?kind=barber' })
    expect(splitLocale('/ky')).toEqual({ locale: 'ky', path: '/' })
    expect(splitLocale('/map')).toEqual({ locale: 'en', path: '/map' })
    expect(splitLocale('/ruslan-barber')).toEqual({ locale: 'en', path: '/ruslan-barber' })
    expect(localizePath('/map', 'ru')).toBe('/ru/map')
    expect(localizePath('/', 'ky')).toBe('/ky')
    expect(localizePath('/?kind=barber', 'ru')).toBe('/ru?kind=barber')
    expect(localizePath('/ru/map', 'en')).toBe('/map')
    expect(localizePath('/api/me', 'ru')).toBe('/api/me')
    expect(localizePath('https://wa.me/1', 'ru')).toBe('https://wa.me/1')
  })
})
