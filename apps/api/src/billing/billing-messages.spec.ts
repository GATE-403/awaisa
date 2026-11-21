import { describe, expect, it } from 'vitest'
import { orderTitle, reminderText } from './billing-messages.js'

describe('billing messages', () => {
  it('names an order', () => {
    expect(orderTitle({ kind: 'plan', planTitle: 'Бизнес', months: 12, smsCount: null })).toBe(
      'Тариф «Бизнес» на 1 год',
    )
    expect(orderTitle({ kind: 'sms', planTitle: null, months: null, smsCount: 500 })).toBe(
      'Пакет 500 SMS',
    )
  })

  it('reminds before the end and tells when it ended', () => {
    const input = {
      businessName: 'Барбер',
      planTitle: 'Бизнес',
      isTrial: true,
      endsAt: new Date('2026-11-24T08:00:00Z'),
      link: 'https://awaisa.kg/manage/barber?tab=billing',
    }
    expect(reminderText('soon', input)).toBe(
      'Барбер: Пробный период заканчивается 24 ноября. Продлить: https://awaisa.kg/manage/barber?tab=billing',
    )
    expect(reminderText('ended', { ...input, isTrial: false })).toContain(
      'тариф «Бизнес» закончился, касса, аналитика и рассылки закрыты',
    )
  })
})
