import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { agoLabel } from '../lib/since'

const i18n = setupI18n({ locale: 'en', messages: { en: {} } })
const t = i18n._.bind(i18n)

describe('agoLabel', () => {
  it('says how long ago in the shortest words that still read', () => {
    expect(agoLabel('2026-11-23', '2026-11-23', t)).toBe('today')
    expect(agoLabel('2026-11-22', '2026-11-23', t)).toBe('yesterday')
    expect(agoLabel('2026-11-18', '2026-11-23', t)).toBe('5 d ago')
    expect(agoLabel('2026-11-01', '2026-11-23', t)).toBe('3 wk ago')
    expect(agoLabel('2026-07-01', '2026-11-23', t)).toBe('4 mo ago')
    expect(agoLabel('2024-11-01', '2026-11-23', t)).toBe('2 yr ago')
  })
})
