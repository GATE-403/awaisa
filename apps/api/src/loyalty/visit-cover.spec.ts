import { subscriptionCovers } from './visit-cover.js'

describe('subscriptionCovers', () => {
  it('pays a visit of one service whole', () => {
    expect(subscriptionCovers({ due: 1200 }, 'cut')).toBe(1200)
    expect(subscriptionCovers({ due: 900, lines: [{ serviceId: 'cut', price: 1200 }] }, null)).toBe(
      900,
    )
  })

  it('pays only its own service of several', () => {
    const visit = {
      due: 2000,
      lines: [
        { serviceId: 'cut', price: 1500 },
        { serviceId: 'beard', price: 700 },
      ],
    }
    expect(subscriptionCovers(visit, 'beard')).toBe(700)
    expect(subscriptionCovers(visit, null)).toBe(1500)
    expect(subscriptionCovers({ ...visit, due: 600 }, 'cut')).toBe(600)
  })
})
