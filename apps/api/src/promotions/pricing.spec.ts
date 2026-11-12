import { bestDiscount, isKnownCode, type PromotionRule } from './pricing.js'

const rule = (overrides: Partial<PromotionRule>): PromotionRule => ({
  id: 'p',
  title: 'Акция',
  kind: 'happy_hours',
  percent: 20,
  code: null,
  weekdays: null,
  fromMinutes: null,
  toMinutes: null,
  serviceIds: null,
  startsOn: null,
  endsOn: null,
  isActive: true,
  ...overrides,
})

const input = {
  serviceId: 'cut',
  price: 1500,
  date: '2026-11-16',
  weekday: 0,
  minutes: 10 * 60,
  isFirstVisit: false,
  code: null,
}

describe('promotion pricing', () => {
  it('happy hours: weekdays before noon', () => {
    const morning = rule({ weekdays: [0, 1, 2, 3, 4], fromMinutes: 0, toMinutes: 12 * 60 })
    expect(bestDiscount([morning], input)?.amount).toBe(300)
    expect(bestDiscount([morning], { ...input, minutes: 12 * 60 })).toBeNull()
    expect(bestDiscount([morning], { ...input, weekday: 5 })).toBeNull()
  })

  it('first visit only for new clients', () => {
    const first = rule({ kind: 'first_visit', percent: 10 })
    expect(bestDiscount([first], input)).toBeNull()
    expect(bestDiscount([first], { ...input, isFirstVisit: true })?.amount).toBe(150)
  })

  it('promo codes match case-insensitively', () => {
    const code = rule({ kind: 'promo_code', code: 'AUTUMN', percent: 15 })
    expect(bestDiscount([code], { ...input, code: ' autumn ' })?.amount).toBe(225)
    expect(bestDiscount([code], { ...input, code: 'SPRING' })).toBeNull()
    expect(isKnownCode([code], 'Autumn')).toBe(true)
    expect(isKnownCode([code], 'nope')).toBe(false)
  })

  it('never stacks: the biggest discount wins', () => {
    const rules = [rule({ id: 'a', percent: 10 }), rule({ id: 'b', percent: 25 })]
    expect(bestDiscount(rules, input)?.promotionId).toBe('b')
  })

  it('respects services, dates and the switch', () => {
    expect(bestDiscount([rule({ serviceIds: ['color'] })], input)).toBeNull()
    expect(bestDiscount([rule({ endsOn: '2026-11-15' })], input)).toBeNull()
    expect(bestDiscount([rule({ startsOn: '2026-11-17' })], input)).toBeNull()
    expect(bestDiscount([rule({ isActive: false })], input)).toBeNull()
  })
})
