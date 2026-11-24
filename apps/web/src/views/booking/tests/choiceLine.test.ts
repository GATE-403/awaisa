import { describe, expect, it } from 'vitest'
import { choiceLine } from '../lib/choiceLine'

describe('choiceLine', () => {
  it('is empty before anything is chosen', () => {
    expect(choiceLine({ services: [], master: null, when: null })).toBe('')
  })

  it('names the service, then the master, then when', () => {
    expect(choiceLine({ services: ['Styling'], master: null, when: null })).toBe('Styling')
    expect(choiceLine({ services: ['Styling'], master: 'Meerim', when: null })).toBe(
      'Styling · Meerim',
    )
    expect(
      choiceLine({ services: ['Styling'], master: 'Any specialist', when: 'Mon 23 Nov, 10:00' }),
    ).toBe('Styling · Any specialist · Mon 23 Nov, 10:00')
  })

  it('counts added services instead of naming them all', () => {
    expect(
      choiceLine({
        services: ["Men's haircut", 'Beard trim'],
        master: 'Erlan',
        when: null,
      }),
    ).toBe("Men's haircut +1 · Erlan")
    expect(
      choiceLine({ services: ['Manicure', 'Pedicure', 'Gel polish'], master: null, when: null }),
    ).toBe('Manicure +2')
  })
})
