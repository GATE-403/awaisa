import { renderMailing, smsParts } from './mailing-text.js'

describe('mailing text', () => {
  it('fills the first name and the link', () => {
    expect(
      renderMailing('{name}, we miss you! Book: {link}', 'Aigerim Sadykova', 'https://a.kg/x'),
    ).toBe('Aigerim, we miss you! Book: https://a.kg/x')
  })

  it('still fills templates saved with the Russian placeholders', () => {
    expect(renderMailing('{имя}, book again: {ссылка}', 'Aigerim', 'https://a.kg/x')).toBe(
      'Aigerim, book again: https://a.kg/x',
    )
  })

  it('greets without a name', () => {
    expect(renderMailing('{name}, see you soon', '', '')).toBe('Hello, see you soon')
  })

  it('counts GSM-7 parts for plain Latin text', () => {
    expect(smsParts('a'.repeat(160))).toBe(1)
    expect(smsParts('a'.repeat(161))).toBe(2)
    expect(smsParts('a'.repeat(307))).toBe(3)
  })

  it('counts the GSM extension characters twice', () => {
    expect(smsParts(`${'a'.repeat(159)}€`)).toBe(2)
  })

  it('counts UCS-2 parts once any character is outside the GSM alphabet', () => {
    expect(smsParts('а'.repeat(70))).toBe(1)
    expect(smsParts('а'.repeat(71))).toBe(2)
    expect(smsParts(`${'a'.repeat(100)}🙏`)).toBe(2)
    expect(smsParts('а'.repeat(135))).toBe(3)
  })
})
