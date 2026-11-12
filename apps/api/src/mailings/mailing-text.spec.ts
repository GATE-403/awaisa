import { renderMailing, smsParts } from './mailing-text.js'

describe('mailing text', () => {
  it('fills the first name and the link', () => {
    expect(
      renderMailing('{имя}, скучаем! Запись: {ссылка}', 'Айгерим Садыкова', 'https://a.kg/x'),
    ).toBe('Айгерим, скучаем! Запись: https://a.kg/x')
  })

  it('greets without a name', () => {
    expect(renderMailing('{имя}, ждём вас', '', '')).toBe('Здравствуйте, ждём вас')
  })

  it('counts Cyrillic SMS parts', () => {
    expect(smsParts('а'.repeat(70))).toBe(1)
    expect(smsParts('а'.repeat(71))).toBe(2)
    expect(smsParts('а'.repeat(135))).toBe(3)
  })
})
