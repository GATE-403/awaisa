import {
  analyticsGoalSchema,
  analyticsQuerySchema,
  createTimeOffSchema,
  moveBookingSchema,
  outcomeSchema,
  reopenSchema,
  scheduleLoadQuerySchema,
} from './admin.schemas.js'

describe('cabinet request schemas', () => {
  it('analytics takes only the offered periods and defaults to a month', () => {
    expect(analyticsQuerySchema.parse({})).toEqual({ days: 30 })
    for (const days of ['7', '30', '90', '365']) {
      expect(analyticsQuerySchema.parse({ days }).days).toBe(Number(days))
    }
    expect(analyticsQuerySchema.safeParse({ days: '12' }).success).toBe(false)
  })

  it('the month’s goal is at least 1 000 som, whole, or null to clear it', () => {
    expect(analyticsGoalSchema.parse({ goal: 50_000 })).toEqual({ goal: 50_000 })
    expect(analyticsGoalSchema.parse({ goal: null })).toEqual({ goal: null })
    expect(analyticsGoalSchema.safeParse({ goal: 999 }).success).toBe(false)
    expect(analyticsGoalSchema.safeParse({ goal: 1500.5 }).success).toBe(false)
  })

  it('the day strip’s load is read for 1 to 42 days', () => {
    expect(scheduleLoadQuerySchema.parse({ from: '2026-11-01', days: '28' })).toEqual({
      from: '2026-11-01',
      days: 28,
    })
    expect(scheduleLoadQuerySchema.safeParse({ from: '2026-11-01', days: '43' }).success).toBe(
      false,
    )
    expect(scheduleLoadQuerySchema.safeParse({ from: '01.11.2026', days: '7' }).success).toBe(false)
  })

  it('closed time must end after it starts', () => {
    const base = { specialistId: 'm1', date: '2026-11-21', reason: '' }
    expect(createTimeOffSchema.safeParse({ ...base, from: '13:00', to: '14:00' }).success).toBe(
      true,
    )
    // Closing up to midnight is allowed.
    expect(createTimeOffSchema.safeParse({ ...base, from: '20:00', to: '24:00' }).success).toBe(
      true,
    )
    const backwards = createTimeOffSchema.safeParse({ ...base, from: '14:00', to: '13:00' })
    expect(backwards.success).toBe(false)
    expect(backwards.error?.issues[0]?.path).toEqual(['to'])
    expect(createTimeOffSchema.safeParse({ ...base, from: '9:00', to: '10:00' }).success).toBe(
      false,
    )
  })

  it('a booking moves to a real time of day', () => {
    const move = { date: '2026-11-21', specialistId: 'm1' }
    expect(moveBookingSchema.safeParse({ ...move, time: '23:45' }).success).toBe(true)
    expect(moveBookingSchema.safeParse({ ...move, time: '24:00' }).success).toBe(false)
    expect(moveBookingSchema.safeParse({ ...move, time: '12:60' }).success).toBe(false)
  })

  it('a visit is marked arrived, a no-show or back to waiting; payments are whole som', () => {
    expect(outcomeSchema.safeParse({ outcome: null }).success).toBe(true)
    expect(
      outcomeSchema.safeParse({ outcome: 'arrived', paidAmount: 1500, paymentMethod: 'card' })
        .success,
    ).toBe(true)
    expect(outcomeSchema.safeParse({ outcome: 'late' }).success).toBe(false)
    expect(outcomeSchema.safeParse({ outcome: 'arrived', paidAmount: -1 }).success).toBe(false)
    expect(outcomeSchema.safeParse({ outcome: 'arrived', paymentMethod: 'crypto' }).success).toBe(
      false,
    )
    expect(outcomeSchema.safeParse({ outcome: 'arrived', bonusAmount: 0 }).success).toBe(false)
  })

  it('«Вернуть» after «Все пришли» names the visits it reopens', () => {
    expect(reopenSchema.safeParse({ ids: [] }).success).toBe(false)
    expect(reopenSchema.safeParse({ ids: ['not-a-uuid'] }).success).toBe(false)
    expect(reopenSchema.safeParse({ ids: ['6f1c2a4e-1b2c-4d3e-8f9a-0b1c2d3e4f5a'] }).success).toBe(
      true,
    )
  })
})
