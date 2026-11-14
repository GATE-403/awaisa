import { describe, expect, it } from 'vitest'
import { linksView, normalizeLinks } from './profile-links.js'

describe('normalizeLinks', () => {
  it('keeps the handle from «@name», a bare name or a pasted link', () => {
    expect(
      normalizeLinks({
        instagram: 'https://www.instagram.com/aigerim.nails/?hl=ru',
        telegram: '@aigerim_s',
        tiktok: 'tiktok.com/@aigerim.k',
      }).links,
    ).toEqual({ instagram: 'aigerim.nails', telegram: 'aigerim_s', tiktok: 'aigerim.k' })
  })

  it('makes a website https and drops its hash', () => {
    expect(normalizeLinks({ website: 'example.kg/works#top' }).links).toEqual({
      website: 'https://example.kg/works',
    })
  })

  it('names the fields that cannot be read and clears empty ones', () => {
    const result = normalizeLinks({
      telegram: 'abc',
      website: 'javascript:alert(1)',
      instagram: '',
    })
    expect(result.invalid).toEqual(['telegram', 'website'])
    expect(result.links).toEqual({})
  })

  it('refuses addresses with credentials or without a real host', () => {
    expect(normalizeLinks({ website: 'https://user:pw@example.kg' }).invalid).toEqual(['website'])
    expect(normalizeLinks({ website: 'localhost' }).invalid).toEqual(['website'])
  })
})

describe('linksView', () => {
  it('builds the addresses itself, in a fixed order', () => {
    expect(linksView({ website: 'https://example.kg', instagram: 'nails' })).toEqual([
      { kind: 'instagram', label: 'Instagram', text: '@nails', url: 'https://instagram.com/nails' },
      { kind: 'website', label: 'Сайт', text: 'example.kg', url: 'https://example.kg' },
    ])
  })
})
