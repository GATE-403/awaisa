import { describe, expect, it } from 'vitest'
import { coversService, fullPrice, issuedSubscription, shouldIssue } from './subscription-orders.js'

const terms = { title: '5 стрижек', serviceId: 'cut', visits: 5, validDays: 90, amount: 6000 }

describe('shouldIssue', () => {
  it('issues the subscription for an order still waiting for its payment', () => {
    expect(shouldIssue('pending')).toBe(true)
  })

  it('still issues it when the payment came after the order expired: the money is in', () => {
    expect(shouldIssue('expired')).toBe(true)
  })

  it('issues nothing twice for an order already paid', () => {
    expect(shouldIssue('paid')).toBe(false)
  })
})

describe('issuedSubscription', () => {
  it('is dated by the payment and runs its days from the payment day in Bishkek', () => {
    // 20:30 UTC on 21 Nov is 02:30 on 22 Nov in Bishkek.
    const paidAt = new Date('2026-11-21T20:30:00Z')
    expect(issuedSubscription(terms, paidAt)).toEqual({
      title: '5 стрижек',
      serviceId: 'cut',
      visitsTotal: 5,
      visitsLeft: 5,
      pricePaid: 6000,
      expiresOn: '2027-02-20',
      createdAt: paidAt,
    })
  })
})

describe('fullPrice and coversService', () => {
  it('counts what the visits cost one by one, nothing for a plan for any service', () => {
    expect(fullPrice(5, 1500)).toBe(7500)
    expect(fullPrice(5, null)).toBeNull()
  })

  it('lets a plan for any service pay any visit, a service plan only its own', () => {
    expect(coversService(null, 'nails')).toBe(true)
    expect(coversService('cut', 'cut')).toBe(true)
    expect(coversService('cut', 'nails')).toBe(false)
  })
})
