import { describe, expect, it } from 'vitest'
import { describeItem, describeReasons } from '../lib/describe'

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
