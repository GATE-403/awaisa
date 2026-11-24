import { setupI18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import {
  describeItem as describeItemIn,
  describeReasons as describeReasonsIn,
} from '../lib/describe'

const i18n = setupI18n({ locale: 'en', messages: { en: {} } })
const t = i18n._.bind(i18n)
const describeItem = (item: Parameters<typeof describeItemIn>[0]) => describeItemIn(item, t)
const describeReasons = (reasons: Parameters<typeof describeReasonsIn>[0]) =>
  describeReasonsIn(reasons, t)

describe('describeItem', () => {
  it('names the kind, the place and the count', () => {
    expect(
      describeItem({
        targetType: 'photo',
        reports: 3,
        preview: {
          title: 'Fade',
          text: null,
          imageUrl: null,
          rating: null,
          href: null,
          business: { slug: 'old-school', name: 'Old School' },
        },
      }),
    ).toBe('Work photo · Old School · 3 reports')
  })

  it('leaves out a place a profile does not have', () => {
    expect(describeItem({ targetType: 'profile', reports: 1, preview: null })).toBe(
      'Profile · 1 report',
    )
  })
})

describe('describeReasons', () => {
  it('puts each reason in words with its count', () => {
    expect(
      describeReasons([
        { reason: 'spam', count: 2 },
        { reason: 'offensive', count: 1 },
      ]),
    ).toBe('Spam or advertising 2 · Insults 1')
  })
})
