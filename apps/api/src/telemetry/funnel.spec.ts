import { describe, expect, it } from 'vitest'
import { buildFunnel } from './funnel.js'

describe('buildFunnel', () => {
  it('orders steps, fills the missing ones and counts what each step kept', () => {
    const funnel = buildFunnel([
      { step: 'booked', sessions: 5 },
      { step: 'catalog', sessions: 200 },
      { step: 'booking_open', sessions: 40 },
      { step: 'time', sessions: 10 },
    ])
    expect(funnel.map((row) => row.step)).toEqual([
      'catalog',
      'business',
      'booking_open',
      'service',
      'specialist',
      'time',
      'contacts',
      'booked',
    ])
    expect(funnel[0]).toEqual({
      step: 'catalog',
      sessions: 200,
      fromPrevious: null,
      fromStart: 100,
    })
    expect(funnel[1]?.sessions).toBe(0)
    expect(funnel[2]?.fromPrevious).toBeNull()
    expect(funnel[2]?.fromStart).toBe(20)
    expect(funnel[7]).toMatchObject({ sessions: 5, fromStart: 2.5 })
  })

  it('has no shares when nobody came', () => {
    expect(buildFunnel([]).every((row) => row.fromStart === null)).toBe(true)
  })
})
