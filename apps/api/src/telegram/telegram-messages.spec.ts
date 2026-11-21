import {
  dayText,
  escapeHtml,
  newBookingText,
  photoModeratedText,
  reviewText,
} from './telegram-messages.js'

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

  it('a photo taken down by a moderator names the place, the service and what happened', () => {
    const hidden = photoModeratedText('Барбер <1>', 'Fade', 'hide', 'https://awaisa.kg/manage/b')
    expect(hidden).toContain('скрыто модератором')
    expect(hidden).toContain('Барбер &lt;1&gt;')
    expect(hidden).toContain('Услуга: Fade.')
    expect(photoModeratedText('A', null, 'delete', 'https://x')).toContain('удалено модератором')
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

  it('asks for an answer in person on a poor rating only', () => {
    const review = { comment: 'Долго ждал', authorName: 'Даян', specialistName: 'Айгерим' }
    const url = 'https://awaisa.kg/manage/a?tab=reviews'
    expect(reviewText('A', { ...review, rating: 2 }, url)).toContain(
      `<a href="${url}">открыть отзывы</a>`,
    )
    expect(reviewText('A', { ...review, rating: 5 }, url)).not.toContain('Ответьте')
  })
})
