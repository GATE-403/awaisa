import { describe, expect, it } from 'vitest'
import {
  extendUntil,
  featureLockedMessage,
  hasFeature,
  limitProblem,
  monthlyPrice,
  type PlanRow,
  periodPrice,
  planTitleOf,
  reminderDue,
  resolveAccess,
  smsAllowance,
  usageMonth,
  withPlanCopy,
} from './plan-rules.js'

const start: PlanRow = {
  key: 'start',
  title: 'Start',
  description: '',
  monthlyPrice: 0,
  includedMasters: 0,
  extraMasterPrice: 0,
  maxMasters: 2,
  maxBranches: 1,
  smsPerMonth: 50,
  smsPerMaster: 0,
  features: [],
  trialDays: 0,
  isPublic: true,
  position: 1,
}
const business: PlanRow = {
  ...start,
  key: 'business',
  title: 'Business',
  monthlyPrice: 990,
  includedMasters: 3,
  extraMasterPrice: 290,
  maxMasters: null,
  maxBranches: 3,
  smsPerMonth: 0,
  smsPerMaster: 300,
  features: ['cashdesk', 'analytics', 'fiscal'],
  trialDays: 30,
  position: 2,
}
const founders: PlanRow = {
  ...business,
  key: 'founders',
  title: 'Founder',
  monthlyPrice: 0,
  maxBranches: null,
  smsPerMonth: null,
  isPublic: false,
  position: 3,
}
const plans = [start, business, founders]

const now = new Date('2026-11-21T10:00:00Z')
const days = (count: number) => new Date(now.getTime() + count * 24 * 60 * 60 * 1000)

describe('resolveAccess', () => {
  it('keeps everything for businesses from before plans', () => {
    expect(resolveAccess(null, now)).toEqual({
      planKey: 'founders',
      status: 'lifetime',
      endsAt: null,
    })
  })

  it('runs the trial, then falls back to the free plan', () => {
    const subscription = {
      planKey: 'business',
      trialEndsAt: days(5),
      paidUntil: null,
      isLifetime: false,
    }
    expect(resolveAccess(subscription, now)).toEqual({
      planKey: 'business',
      status: 'trial',
      endsAt: days(5),
    })
    expect(resolveAccess({ ...subscription, trialEndsAt: days(-1) }, now)).toEqual({
      planKey: 'start',
      status: 'expired',
      endsAt: days(-1),
    })
  })

  it('counts a paid period as active', () => {
    const subscription = {
      planKey: 'business',
      trialEndsAt: days(-40),
      paidUntil: days(20),
      isLifetime: false,
    }
    expect(resolveAccess(subscription, now).status).toBe('active')
  })

  it('treats a business that never had a paid plan as free', () => {
    const subscription = { planKey: 'start', trialEndsAt: null, paidUntil: null, isLifetime: false }
    expect(resolveAccess(subscription, now)).toEqual({
      planKey: 'start',
      status: 'free',
      endsAt: null,
    })
  })
})

describe('prices', () => {
  it('charges for masters past the included ones', () => {
    expect(monthlyPrice(business, 1)).toBe(990)
    expect(monthlyPrice(business, 3)).toBe(990)
    expect(monthlyPrice(business, 5)).toBe(990 + 2 * 290)
  })

  it('takes ten months for a year', () => {
    expect(periodPrice(business, 2, 1)).toBe(990)
    expect(periodPrice(business, 2, 12)).toBe(9900)
  })

  it('gives SMS per master on the paid plan and a flat number on the free one', () => {
    expect(smsAllowance(start, 2)).toBe(50)
    expect(smsAllowance(business, 4)).toBe(1200)
    expect(smsAllowance(founders, 10)).toBeNull()
  })
})

describe('limits', () => {
  it('refuses a third master on the free plan and names the paid one', () => {
    expect(limitProblem(plans, start, 'masters', 1)).toBeNull()
    expect(limitProblem(plans, start, 'masters', 2)).toBe(
      'The “Start” plan allows up to 2 specialists. More on the “Business” plan',
    )
  })

  it('names no public plan when none has more room', () => {
    expect(limitProblem(plans, business, 'branches', 3)).toBe(
      'The “Business” plan allows up to 3 branches',
    )
    expect(limitProblem(plans, founders, 'branches', 30)).toBeNull()
  })

  it('names the cheapest public plan with a locked feature', () => {
    expect(featureLockedMessage(plans, 'cashdesk')).toBe('Available on the “Business” plan')
    expect(featureLockedMessage(plans, 'mailings')).toBe('Not available on your plan')
    expect(featureLockedMessage(plans, 'fiscal')).toBe('Available on the “Business” plan')
    expect(hasFeature(start, 'fiscal')).toBe(false)
    expect(hasFeature(founders, 'fiscal')).toBe(true)
  })
})

describe('plan copy', () => {
  it('shows the seeded plans in English and leaves a plan added by hand as it is', () => {
    expect(withPlanCopy({ ...start, title: 'Старт' }).title).toBe('Start')
    expect(withPlanCopy({ ...founders, title: 'Основатель' }).description).toBe(
      'Everything, no limits, for the first businesses',
    )
    expect(withPlanCopy({ ...start, key: 'pro', title: 'Pro' }).title).toBe('Pro')
    expect(planTitleOf('business', 'Бизнес')).toBe('Business')
  })
})

describe('extendUntil', () => {
  it('adds months after the trial still running', () => {
    const subscription = {
      planKey: 'business',
      trialEndsAt: days(10),
      paidUntil: null,
      isLifetime: false,
    }
    expect(extendUntil(subscription, now, 1).toISOString()).toBe('2027-01-01T10:00:00.000Z')
  })

  it('starts from today when everything has ended', () => {
    const subscription = {
      planKey: 'business',
      trialEndsAt: days(-60),
      paidUntil: days(-5),
      isLifetime: false,
    }
    expect(extendUntil(subscription, now, 12).toISOString()).toBe('2027-11-21T10:00:00.000Z')
  })
})

describe('reminderDue', () => {
  it('reminds three days before the end, once', () => {
    const access = { planKey: 'business', status: 'trial' as const, endsAt: days(2) }
    const due = reminderDue(access, null, now)
    expect(due?.stage).toBe('soon')
    expect(reminderDue(access, due?.key ?? null, now)).toBeNull()
    expect(reminderDue({ ...access, endsAt: days(10) }, null, now)).toBeNull()
  })

  it('tells once that the plan has ended, but not about old history', () => {
    const access = { planKey: 'start', status: 'expired' as const, endsAt: days(-1) }
    expect(reminderDue(access, null, now)?.stage).toBe('ended')
    expect(reminderDue({ ...access, endsAt: days(-30) }, null, now)).toBeNull()
  })

  it('says nothing for lifetime access', () => {
    expect(
      reminderDue({ planKey: 'founders', status: 'lifetime', endsAt: null }, null, now),
    ).toBeNull()
  })
})

describe('usageMonth', () => {
  it('counts in Bishkek time', () => {
    expect(usageMonth(new Date('2026-11-30T19:00:00Z'))).toBe('2026-12-01')
    expect(usageMonth(new Date('2026-11-30T17:00:00Z'))).toBe('2026-11-01')
  })
})
