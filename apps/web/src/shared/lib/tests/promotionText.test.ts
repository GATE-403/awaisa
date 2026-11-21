import { describe, expect, it } from 'vitest'
import type { PublicPromotion } from '@/shared/api/types'
import { describePromotion } from '../promotionText'

const promotion = (fields: Partial<PublicPromotion>) =>
  ({
    kind: 'happy_hours',
    percent: 20,
    weekdays: null,
    fromMinutes: null,
    toMinutes: null,
    ...fields,
    // Only the fields the line reads.
  }) as PublicPromotion

describe('describePromotion', () => {
  it('a first visit discount', () => {
    expect(describePromotion(promotion({ kind: 'first_visit', percent: 10 }))).toBe(
      '−10% на первый визит',
    )
  })

  it('weekdays and weekends read as words, other days as a list', () => {
    expect(describePromotion(promotion({ weekdays: [4, 0, 1, 2, 3] }))).toBe('−20% по будням')
    expect(describePromotion(promotion({ weekdays: [6, 5] }))).toBe('−20% по выходным')
    expect(describePromotion(promotion({ weekdays: [0, 2] }))).toBe('−20% пн, ср')
    expect(describePromotion(promotion({ weekdays: [0, 1, 2, 3, 4, 5, 6] }))).toBe('−20%')
  })

  it('hours as a span, or only their start or end', () => {
    expect(
      describePromotion(promotion({ weekdays: [0, 1, 2, 3, 4], fromMinutes: 600, toMinutes: 720 })),
    ).toBe('−20% по будням 10:00–12:00')
    expect(describePromotion(promotion({ toMinutes: 720 }))).toBe('−20% до 12:00')
    expect(describePromotion(promotion({ fromMinutes: 1110 }))).toBe('−20% с 18:30')
  })
})
