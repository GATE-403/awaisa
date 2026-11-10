import { dayText, escapeHtml, newBookingText, reviewText } from './telegram-messages.js'

const booking = {
  time: '14:30',
  serviceName: 'Женская стрижка',
  specialistName: 'Айгерим',
  customerName: 'Даян <script>',
  customerPhone: '+996555123456',
}

describe('Telegram messages', () => {
  it('escapes HTML so a client name cannot break the message', () => {
    expect(escapeHtml('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;')
    expect(newBookingText('Awaisa', '2026-11-12', booking)).toContain('Даян &lt;script&gt;')
  })

  it('a new booking has the date, time, master and the client phone', () => {
    const text = newBookingText('Awaisa Studio', '2026-11-12', booking)
    expect(text).toContain('12 ноября, <b>14:30</b>')
    expect(text).toContain('Мастер: Айгерим')
    expect(text).toContain('+996555123456')
  })

  it('the day digest counts bookings in Russian', () => {
    expect(dayText('A', '2026-11-12', [booking, booking])).toContain('2 записи')
    expect(dayText('A', '2026-11-12', [])).toContain('Записей нет')
  })

  it('a review shows stars and the comment', () => {
    expect(
      reviewText('A', {
        rating: 4,
        comment: 'Супер',
        authorName: 'Даян',
        specialistName: 'Айгерим',
      }),
    ).toMatch(/^★★★★☆ .*«Супер»/s)
  })
})
