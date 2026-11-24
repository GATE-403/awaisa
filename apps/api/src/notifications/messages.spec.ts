import {
  confirmationMessage,
  reminderMessage,
  returnVisitMessage,
  waitlistFreedMessage,
} from './messages.js'

const booking = {
  business: { name: 'Awaisa Studio', slug: 'awaisa-studio' },
  serviceName: "Women's haircut",
  specialistName: 'Aigerim Sadykova',
  date: '2026-11-12',
  time: '14:30',
}

describe('SMS messages', () => {
  it('confirmation has the date, time, master and a cancel link', () => {
    expect(confirmationMessage(booking, 'https://awaisa.kg/v/1?s=x')).toBe(
      "Awaisa Studio: you're booked - Women's haircut, 12 November at 14:30 with Aigerim Sadykova. Change or cancel: https://awaisa.kg/v/1?s=x",
    )
  })

  it('reminder fits in one SMS segment', () => {
    expect(reminderMessage(booking).length).toBeLessThanOrEqual(160)
  })

  it('waitlist SMS names the freed time and links to it', () => {
    expect(
      waitlistFreedMessage(
        'Awaisa Studio',
        "Women's haircut",
        '2026-11-12',
        '15:30',
        'https://a.kg/x',
      ),
    ).toBe(
      "Awaisa Studio: a time has opened up - Women's haircut, 12 November at 15:30. Book before it goes: https://a.kg/x",
    )
  })

  it('return-visit SMS names the service and the master by first name', () => {
    expect(returnVisitMessage('Kings', "Men's haircut", 'Erlan Sydykov', 'https://a.kg/b')).toBe(
      "Kings: time for another «Men's haircut»? Erlan is ready for you - book: https://a.kg/b",
    )
  })
})
