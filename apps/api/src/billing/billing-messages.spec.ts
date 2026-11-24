import { describe, expect, it } from 'vitest'
import { orderTitle, reminderText } from './billing-messages.js'

describe('billing messages', () => {
  it('names an order', () => {
    expect(orderTitle({ kind: 'plan', planTitle: 'Business', months: 12, smsCount: null })).toBe(
      '«Business» plan for 1 year',
    )
    expect(orderTitle({ kind: 'sms', planTitle: null, months: null, smsCount: 500 })).toBe(
      '500 SMS pack',
    )
  })

  it('reminds before the end and tells when it ended', () => {
    const input = {
      businessName: 'Barber',
      planTitle: 'Business',
      isTrial: true,
      endsAt: new Date('2026-11-24T08:00:00Z'),
      link: 'https://awaisa.kg/manage/barber?tab=billing',
    }
    expect(reminderText('soon', input)).toBe(
      'Barber: Your free trial ends on 24 November. Renew: https://awaisa.kg/manage/barber?tab=billing',
    )
    expect(reminderText('ended', { ...input, isTrial: false })).toContain(
      'your «Business» plan has ended, so the till, analytics and mailings are closed',
    )
  })
})
