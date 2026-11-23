import { describe, expect, it } from 'vitest'
import type { Translate } from '@/shared/i18n'
import { agoLabel } from '../lib/since'

const t = ((text: string, vars?: Record<string, unknown>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars?.[key] ?? ''))) as Translate

describe('agoLabel', () => {
  it('says how long ago in the shortest words that still read', () => {
    expect(agoLabel('2026-11-23', '2026-11-23', t)).toBe('сегодня')
    expect(agoLabel('2026-11-22', '2026-11-23', t)).toBe('вчера')
    expect(agoLabel('2026-11-18', '2026-11-23', t)).toBe('5 дн. назад')
    expect(agoLabel('2026-11-01', '2026-11-23', t)).toBe('3 нед. назад')
    expect(agoLabel('2026-07-01', '2026-11-23', t)).toBe('4 мес. назад')
    expect(agoLabel('2024-11-01', '2026-11-23', t)).toBe('2 г. назад')
  })
})
