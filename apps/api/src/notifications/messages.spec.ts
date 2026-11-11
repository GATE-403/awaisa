import {
  confirmationMessage,
  otpMessage,
  reminderMessage,
  waitlistFreedMessage,
} from './messages.js'

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
    expect(confirmationMessage(booking, 'https://awaisa.kg/v/1?s=x')).toBe(
      'Awaisa Studio: вы записаны — Женская стрижка, 12 ноября в 14:30, мастер Айгерим Садыкова. Перенести или отменить: https://awaisa.kg/v/1?s=x',
    )
  })

  it('reminder fits in two SMS segments', () => {
    expect(reminderMessage(booking).length).toBeLessThanOrEqual(134)
  })

  it('waitlist SMS names the freed time and links to it', () => {
    expect(
      waitlistFreedMessage(
        'Awaisa Studio',
        'Женская стрижка',
        '2026-11-12',
        '15:30',
        'https://a.kg/x',
      ),
    ).toBe(
      'Awaisa Studio: освободилось время — Женская стрижка, 12 ноября в 15:30. Успейте записаться: https://a.kg/x',
    )
  })
})
