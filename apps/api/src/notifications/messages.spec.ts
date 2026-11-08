import { confirmationMessage, otpMessage, reminderMessage } from './messages.js'

const booking = {
  business: { name: 'Awaisa Studio', slug: 'awaisa-studio' },
  serviceName: 'Женская стрижка',
  specialistName: 'Айгерим Садыкова',
  date: '2026-11-12',
  time: '14:30',
}

describe('SMS messages', () => {
  it('puts the code first so phones can autofill it', () => {
    expect(otpMessage('123456')).toMatch(/^123456 /)
  })

  it('confirmation has the date, time, master and a cancel link', () => {
    expect(confirmationMessage(booking, 'https://awaisa.kg')).toBe(
      'Awaisa Studio: вы записаны — Женская стрижка, 12 ноября в 14:30, мастер Айгерим Садыкова. Отменить: https://awaisa.kg/bookings',
    )
  })

  it('reminder fits in two SMS segments', () => {
    expect(reminderMessage(booking).length).toBeLessThanOrEqual(134)
  })
})
