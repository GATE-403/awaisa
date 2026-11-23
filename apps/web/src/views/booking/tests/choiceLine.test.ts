import { describe, expect, it } from 'vitest'
import { choiceLine } from '../lib/choiceLine'

describe('choiceLine', () => {
  it('is empty before anything is chosen', () => {
    expect(choiceLine({ services: [], master: null, when: null })).toBe('')
  })

  it('names the service, then the master, then when', () => {
    expect(choiceLine({ services: ['Укладка'], master: null, when: null })).toBe('Укладка')
    expect(choiceLine({ services: ['Укладка'], master: 'Мээрим', when: null })).toBe(
      'Укладка · Мээрим',
    )
    expect(
      choiceLine({ services: ['Укладка'], master: 'Любой мастер', when: 'пн, 23 нояб., 10:00' }),
    ).toBe('Укладка · Любой мастер · пн, 23 нояб., 10:00')
  })

  it('counts added services instead of naming them all', () => {
    expect(
      choiceLine({
        services: ['Мужская стрижка', 'Оформление бороды'],
        master: 'Эрлан',
        when: null,
      }),
    ).toBe('Мужская стрижка +1 · Эрлан')
    expect(
      choiceLine({ services: ['Маникюр', 'Педикюр', 'Покрытие'], master: null, when: null }),
    ).toBe('Маникюр +2')
  })
})
