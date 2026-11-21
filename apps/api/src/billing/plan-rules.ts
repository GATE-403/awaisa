// The rules of business plans, pure: who has which plan now, what it costs, what it allows.
// The plans themselves are rows of `plans` (prices and limits change without a release).

const PLAN_FEATURES = [
  'cashdesk',
  'inventory',
  'analytics',
  'loyalty',
  'promotions',
  'mailings',
  'import',
  'payroll',
  'team',
  'deposits',
] as const

type PlanFeature = (typeof PLAN_FEATURES)[number]

type PlanLimit = 'masters' | 'branches'

type PlanRow = {
  key: string
  title: string
  description: string
  monthlyPrice: number
  /** Masters the monthly price covers; each further active master adds `extraMasterPrice`. */
  includedMasters: number
  extraMasterPrice: number
  /** null: no limit. */
  maxMasters: number | null
  maxBranches: number | null
  /** SMS a month on top of `smsPerMaster` × masters; null: no limit. */
  smsPerMonth: number | null
  smsPerMaster: number
  features: string[]
  trialDays: number
  isPublic: boolean
  position: number
}

type SubscriptionRow = {
  planKey: string
  trialEndsAt: Date | null
  paidUntil: Date | null
  isLifetime: boolean
}

type AccessStatus = 'lifetime' | 'active' | 'trial' | 'free' | 'expired'

type Access = { planKey: string; status: AccessStatus; endsAt: Date | null }

/** Where a business lands when nothing paid is running. */
const FREE_PLAN_KEY = 'start'
/** Businesses without a subscription row predate plans: they keep everything. */
const LEGACY_PLAN_KEY = 'founders'
/** A year is paid as ten months. */
const YEAR_PAID_MONTHS = 10
const PERIODS = [1, 12] as const
/** The first reminder comes this many days before the end. */
const REMIND_DAYS_BEFORE = 3
/** «Тариф закончился» is sent only this long after the end (not for old history). */
const ENDED_NOTICE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

const isFeature = (value: string): value is PlanFeature =>
  (PLAN_FEATURES as readonly string[]).includes(value)

const resolveAccess = (subscription: SubscriptionRow | null, now: Date): Access => {
  if (!subscription) return { planKey: LEGACY_PLAN_KEY, status: 'lifetime', endsAt: null }
  const { planKey, trialEndsAt, paidUntil, isLifetime } = subscription
  if (isLifetime) return { planKey, status: 'lifetime', endsAt: null }
  if (paidUntil && paidUntil > now) {
    // Paid while the trial still ran: the trial's days come first, then the paid ones.
    return { planKey, status: 'active', endsAt: paidUntil }
  }
  if (trialEndsAt && trialEndsAt > now) return { planKey, status: 'trial', endsAt: trialEndsAt }
  const ended = [paidUntil, trialEndsAt].filter((date): date is Date => date !== null)
  if (ended.length === 0) return { planKey: FREE_PLAN_KEY, status: 'free', endsAt: null }
  const endsAt = new Date(Math.max(...ended.map((date) => date.getTime())))

  return { planKey: FREE_PLAN_KEY, status: 'expired', endsAt }
}

const hasFeature = (plan: PlanRow, feature: PlanFeature) => plan.features.includes(feature)

/** The month's price for this many active masters (never fewer than the plan covers). */
const monthlyPrice = (plan: PlanRow, masters: number) =>
  plan.monthlyPrice + Math.max(0, masters - plan.includedMasters) * plan.extraMasterPrice

const periodPrice = (plan: PlanRow, masters: number, months: number) => {
  const monthly = monthlyPrice(plan, masters)
  return months === 12 ? monthly * YEAR_PAID_MONTHS : monthly * months
}

/** SMS a month the plan includes; null: no limit. */
const smsAllowance = (plan: PlanRow, masters: number) =>
  plan.smsPerMonth === null ? null : plan.smsPerMonth + plan.smsPerMaster * masters

const pluralRu = (count: number, [one, few, many]: [string, string, string]) => {
  const tens = count % 100
  const units = count % 10
  if (tens >= 11 && tens <= 14) return many
  if (units === 1) return one
  if (units >= 2 && units <= 4) return few
  return many
}

const LIMIT_WORDS: Record<PlanLimit, [string, string, string]> = {
  masters: ['мастера', 'мастеров', 'мастеров'],
  branches: ['филиала', 'филиалов', 'филиалов'],
}

/** The cheapest public plan that has a feature or more room, to name it in a message. */
const upgradeFor = (plans: PlanRow[], fits: (plan: PlanRow) => boolean) =>
  plans
    .filter((plan) => plan.isPublic && fits(plan))
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice || a.position - b.position)[0] ?? null

const featureLockedMessage = (plans: PlanRow[], feature: PlanFeature) => {
  const upgrade = upgradeFor(plans, (plan) => hasFeature(plan, feature))
  return upgrade ? `Доступно на тарифе «${upgrade.title}»` : 'Недоступно на вашем тарифе'
}

const limitOf = (plan: PlanRow, limit: PlanLimit) =>
  limit === 'masters' ? plan.maxMasters : plan.maxBranches

/** Why one more master or branch is refused on this plan, or null when it fits. */
const limitProblem = (plans: PlanRow[], plan: PlanRow, limit: PlanLimit, current: number) => {
  const max = limitOf(plan, limit)
  if (max === null || current < max) return null
  const words = LIMIT_WORDS[limit]
  const upgrade = upgradeFor(plans, (other) => {
    const otherMax = limitOf(other, limit)
    return otherMax === null || otherMax > max
  })
  const head = `На тарифе «${plan.title}» до ${max} ${pluralRu(max, words)}`

  return upgrade ? `${head}. Больше на тарифе «${upgrade.title}»` : head
}

/** Paying N months: from the later of now, the paid end and the trial's end. */
const extendUntil = (subscription: SubscriptionRow | null, now: Date, months: number) => {
  const starts = [now, subscription?.paidUntil ?? null, subscription?.trialEndsAt ?? null]
    .filter((date): date is Date => date !== null)
    .map((date) => date.getTime())
  const from = new Date(Math.max(...starts))
  const until = new Date(from)
  until.setUTCMonth(until.getUTCMonth() + months)

  return until
}

type ReminderStage = 'soon' | 'ended'

/**
 * Whether the owner should hear about the plan's end now: three days before it, then once it
 * has ended. `key` is stored, so each end date is told once per stage.
 */
const reminderDue = (access: Access, lastReminder: string | null, now: Date) => {
  if (!access.endsAt) return null
  const left = access.endsAt.getTime() - now.getTime()
  let stage: ReminderStage | null = null
  if ((access.status === 'trial' || access.status === 'active') && left > 0) {
    if (left <= REMIND_DAYS_BEFORE * DAY_MS) stage = 'soon'
  } else if (access.status === 'expired' && -left <= ENDED_NOTICE_DAYS * DAY_MS) {
    stage = 'ended'
  }
  if (!stage) return null
  const key = `${access.endsAt.toISOString()}:${stage}`

  return key === lastReminder ? null : { stage, key }
}

/** The first day of the month (business time, UTC+6) a moment falls in, as YYYY-MM-01. */
const usageMonth = (now: Date) => {
  const local = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export {
  type Access,
  type AccessStatus,
  extendUntil,
  FREE_PLAN_KEY,
  featureLockedMessage,
  hasFeature,
  isFeature,
  LEGACY_PLAN_KEY,
  limitProblem,
  monthlyPrice,
  PERIODS,
  PLAN_FEATURES,
  type PlanFeature,
  type PlanLimit,
  type PlanRow,
  periodPrice,
  pluralRu,
  type ReminderStage,
  reminderDue,
  resolveAccess,
  type SubscriptionRow,
  smsAllowance,
  usageMonth,
}
