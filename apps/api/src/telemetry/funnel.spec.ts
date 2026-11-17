import { describe, expect, it } from 'vitest'
import { buildFunnel } from './funnel.js'
import { FUNNEL_STEPS, FUNNELS, funnelEventsSchema, STEP_FLOW } from './telemetry.schemas.js'

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

  it('builds any flow from its own first step', () => {
    const login = buildFunnel(
      [
        { step: 'login_open', sessions: 50 },
        { step: 'otp_sent', sessions: 40 },
        { step: 'login_done', sessions: 30 },
        { step: 'catalog', sessions: 999 },
      ],
      FUNNELS.login,
    )
    expect(login.map((row) => row.step)).toEqual(['login_open', 'otp_sent', 'otp_ok', 'login_done'])
    expect(login[1]).toMatchObject({ sessions: 40, fromPrevious: 80, fromStart: 80 })
    expect(login[3]).toMatchObject({ sessions: 30, fromPrevious: null, fromStart: 60 })
  })
})

describe('funnel steps', () => {
  it('belong to exactly one flow', () => {
    expect(new Set(FUNNEL_STEPS).size).toBe(FUNNEL_STEPS.length)
    expect(STEP_FLOW.get('otp_sent')).toBe('login')
    expect(STEP_FLOW.get('form_error')).toBe('signals')
    expect(STEP_FLOW.get('booked')).toBe('booking')
  })

  it('accept short codes as meta and refuse anything a person could have typed', () => {
    const base = { session: 'device-0001', events: [{ step: 'form_error' as const }] }
    expect(
      funnelEventsSchema.safeParse({
        ...base,
        events: [{ step: 'form_error', meta: { field: 'phone' } }],
      }).success,
    ).toBe(true)
    expect(
      funnelEventsSchema.safeParse({
        ...base,
        events: [{ step: 'form_error', meta: { field: '+996 555 123 456' } }],
      }).success,
    ).toBe(false)
    expect(
      funnelEventsSchema.safeParse({
        ...base,
        events: [{ step: 'form_error', meta: { name: 'x' } }],
      }).success,
    ).toBe(false)
  })
})
