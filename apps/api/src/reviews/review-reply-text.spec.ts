import { DEFAULT_AUTO_TEMPLATE, fillReplyTemplate } from './review-reply-text.js'

const CONTEXT = {
  authorName: 'Asel T.',
  specialistName: 'Maksat Zholdoshev',
  serviceName: 'Hot stone massage',
}

describe('review reply templates', () => {
  it('fills the client, master and service', () => {
    expect(
      fillReplyTemplate('Thank you, {name}! {specialist} will see you for {service}.', CONTEXT),
    ).toBe('Thank you, Asel! Maksat will see you for hot stone massage.')
  })

  it('still fills templates saved with the Russian placeholders', () => {
    expect(fillReplyTemplate('{имя}, {мастер}, {услуга}', CONTEXT)).toBe(
      'Asel, Maksat, hot stone massage',
    )
  })

  it('takes the placeholders in any case', () => {
    expect(fillReplyTemplate('{Name}, {SPECIALIST}, {Имя}', CONTEXT)).toBe('Asel, Maksat, Asel')
  })

  it('keeps a readable sentence when a name is missing', () => {
    expect(
      fillReplyTemplate('Hi {name}! {specialist} thanks you for {service}.', {
        authorName: '',
        specialistName: ' ',
        serviceName: '',
      }),
    ).toBe('Hi there! your specialist thanks you for the service.')
  })

  it('fills the default template', () => {
    expect(fillReplyTemplate(DEFAULT_AUTO_TEMPLATE, CONTEXT)).toBe(
      'Thank you, Asel! We are glad you liked it. See you again soon 🙏',
    )
  })

  it('leaves text without placeholders as it is, trimmed', () => {
    expect(fillReplyTemplate('  Thanks  for  your  review  ', CONTEXT)).toBe(
      'Thanks for your review',
    )
  })

  it('drops stray spaces around a filled name', () => {
    expect(
      fillReplyTemplate('Thank you,  {name}   ! See you', {
        authorName: 'Asel T.',
        specialistName: '',
        serviceName: '',
      }),
    ).toBe('Thank you, Asel! See you')
  })
})
