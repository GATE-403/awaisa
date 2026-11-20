import { DEFAULT_AUTO_TEMPLATE, fillReplyTemplate } from './review-reply-text.js'

const CONTEXT = {
  authorName: 'Асель Т.',
  specialistName: 'Максат Жолдошев',
  serviceName: 'Стоун-терапия',
}

describe('review reply templates', () => {
  it('fills the client, master and service', () => {
    expect(fillReplyTemplate('Спасибо, {имя}! {мастер} ждёт вас на {услуга}.', CONTEXT)).toBe(
      'Спасибо, Асель! Максат ждёт вас на стоун-терапия.',
    )
  })

  it('takes the placeholders in any case', () => {
    expect(fillReplyTemplate('{Имя}, {МАСТЕР}', CONTEXT)).toBe('Асель, Максат')
  })

  it('keeps a readable sentence when a name is missing', () => {
    expect(
      fillReplyTemplate('Спасибо, {имя}! Ждём у {мастер}.', {
        authorName: '',
        specialistName: ' ',
        serviceName: '',
      }),
    ).toBe('Спасибо, гость! Ждём у мастера.')
  })

  it('fills the default template', () => {
    expect(fillReplyTemplate(DEFAULT_AUTO_TEMPLATE, CONTEXT)).toBe(
      'Спасибо, Асель! Рады, что вам понравилось. Ждём вас снова 🙏',
    )
  })

  it('leaves text without placeholders as it is, trimmed', () => {
    expect(fillReplyTemplate('  Спасибо  за  отзыв  ', CONTEXT)).toBe('Спасибо за отзыв')
  })
  it('drops stray spaces around a filled name', () => {
    expect(
      fillReplyTemplate('Спасибо,  {имя}   ! Ждём вас', {
        authorName: 'Асель Т.',
        specialistName: '',
        serviceName: '',
      }),
    ).toBe('Спасибо, Асель! Ждём вас')
  })
})
