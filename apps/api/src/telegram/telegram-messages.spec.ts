import {
  dayText,
  escapeHtml,
  newBookingText,
  photoModeratedText,
  reviewText,
} from './telegram-messages.js'

const booking = {
  time: '14:30',
  serviceName: "Women's haircut",
  specialistName: 'Aigerim',
  customerName: 'Dayan <script>',
  customerPhone: '+996555123456',
}

describe('Telegram messages', () => {
  it('escapes HTML so a client name cannot break the message', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
    expect(newBookingText('Awaisa', '2026-11-12', booking)).toContain('Dayan &lt;script&gt;')
  })

  it('a new booking has the date, time, master and the client phone', () => {
    const text = newBookingText('Awaisa Studio', '2026-11-12', booking)
    expect(text).toContain('12 November, <b>14:30</b>')
    expect(text).toContain('Specialist: Aigerim')
    expect(text).toContain('+996555123456')
  })

  it('a photo taken down by a moderator names the place, the service and what happened', () => {
    const hidden = photoModeratedText('Barber <1>', 'Fade', 'hide', 'https://awaisa.kg/manage/b')
    expect(hidden).toContain('A moderator hid')
    expect(hidden).toContain('Barber &lt;1&gt;')
    expect(hidden).toContain('Service: Fade.')
    expect(photoModeratedText('A', null, 'delete', 'https://x')).toContain('A moderator deleted')
  })

  it('the day digest counts bookings in English', () => {
    expect(dayText('A', '2026-11-12', [booking, booking])).toContain('2 bookings')
    expect(dayText('A', '2026-11-12', [booking])).toContain('1 booking')
    expect(dayText('A', '2026-11-12', [])).toContain('No bookings')
  })

  it('a review shows stars and the comment', () => {
    expect(
      reviewText('A', {
        rating: 4,
        comment: 'Great',
        authorName: 'Dayan',
        specialistName: 'Aigerim',
      }),
    ).toMatch(/^★★★★☆ .*“Great”/s)
  })

  it('asks for an answer in person on a poor rating only', () => {
    const review = { comment: 'Waited a long time', authorName: 'Dayan', specialistName: 'Aigerim' }
    const url = 'https://awaisa.kg/manage/a?tab=reviews'
    expect(reviewText('A', { ...review, rating: 2 }, url)).toContain(
      `<a href="${url}">open reviews</a>`,
    )
    expect(reviewText('A', { ...review, rating: 5 }, url)).not.toContain('Reply')
  })
})
