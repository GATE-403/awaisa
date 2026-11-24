import { PAYMENT_HOLD_MINUTES } from '../bookings/booking-rules.js'
import {
  buyerMessage,
  normalizeAmounts,
  orderDetails,
  orderDueAt,
  recipientMessage,
} from './certificate-sale.js'

const order = {
  business: 'Awaisa Studio',
  amount: 3000,
  code: 'ABCD2345',
  buyerName: 'Nurlan',
  recipientName: 'Aigul',
  hasRecipientPhone: true,
  message: 'Happy birthday!',
  link: 'https://awaisa.kg/awaisa-studio/book',
}

describe('normalizeAmounts', () => {
  it('keeps whole amounts in range, once each, smallest first, six at most', () => {
    expect(normalizeAmounts([5000, 1000, 1000, 50, 2000000, 3000, 2500.4])).toEqual([
      1000, 2500, 3000, 5000,
    ])
    expect(normalizeAmounts([100, 200, 300, 400, 500, 600, 700])).toHaveLength(6)
  })
})

describe('orderDueAt', () => {
  it('waits a little longer than the acquirer holds the payment', () => {
    const now = new Date('2026-11-21T10:00:00Z')
    const minutes = (orderDueAt(now).getTime() - now.getTime()) / 60_000
    expect(minutes).toBeGreaterThan(PAYMENT_HOLD_MINUTES)
    expect(minutes).toBeLessThanOrEqual(PAYMENT_HOLD_MINUTES + 5)
  })
})

describe('messages', () => {
  it('gives the buyer the code and says the recipient got it too', () => {
    const text = buyerMessage(order)
    expect(text).toContain('ABCD2345')
    expect(text).toContain('3,000 som')
    expect(text).toContain('for Aigul')
    expect(text).toContain('sent it to the recipient too')
    expect(text).toContain(order.link)
  })

  it('asks the buyer to hand the code over when the recipient has no number', () => {
    expect(buyerMessage({ ...order, hasRecipientPhone: false })).toContain('Pass the code on')
  })

  it('tells the recipient who it is from, the words and the code', () => {
    const text = recipientMessage(order)
    expect(text).toMatch(/^Aigul, Nurlan has given you a 3,000 som gift card for Awaisa Studio/)
    expect(text).toContain('“Happy birthday!”')
    expect(text).toContain('Code ABCD2345')
  })

  it('reads on /pay as “For … · from …”', () => {
    expect(orderDetails('Aigul', 'Nurlan')).toBe('For Aigul · from Nurlan')
    expect(orderDetails('', 'Nurlan')).toBe('from Nurlan')
  })
})
