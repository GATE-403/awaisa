import type { BillingPlan, PlanAccess, PlanFeature } from '@awaisa/contracts'
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { returnedRows } from '../common/sql.js'
import {
  type Access,
  extendUntil,
  FREE_PLAN_KEY,
  featureLockedMessage,
  hasFeature,
  LEGACY_PLAN_KEY,
  limitProblem,
  type PlanLimit,
  type PlanRow,
  resolveAccess,
  type SubscriptionRow,
  smsAllowance,
  usageMonth,
  withPlanCopy,
} from './plan-rules.js'

type StoredSubscription = SubscriptionRow & { smsExtra: number; lastReminder: string | null }

/** 402 with a message the cabinet shows as it is («Available on the «Business» plan»). */
class PlanRequiredException extends HttpException {
  constructor(message: string) {
    super({ statusCode: HttpStatus.PAYMENT_REQUIRED, message, code: 'plan_required' }, 402)
  }
}

// Plans are read often (every guarded request) and change rarely: kept for a short while.
const PLANS_TTL_MS = 30_000

const PLAN_COLUMNS = `"key", "title", "description", "monthly_price" AS "monthlyPrice",
  "included_masters" AS "includedMasters", "extra_master_price" AS "extraMasterPrice",
  "max_masters" AS "maxMasters", "max_branches" AS "maxBranches", "sms_per_month" AS "smsPerMonth",
  "sms_per_master" AS "smsPerMaster", "features", "trial_days" AS "trialDays",
  "is_public" AS "isPublic", "position"`

/**
 * What a business may do on its plan: the one place the cabinet's paid sections, the masters
 * and branches limits and the month's SMS are checked (`PlanGuard` calls it for whole routes).
 */
@Injectable()
export class BillingService {
  private plansCache: { rows: PlanRow[]; at: number } | null = null

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async plans() {
    if (this.plansCache && Date.now() - this.plansCache.at < PLANS_TTL_MS) {
      return this.plansCache.rows
    }
    const rows = (await this.dataSource.query(
      `SELECT ${PLAN_COLUMNS} FROM "plans" ORDER BY "position"`,
    )) as PlanRow[]
    const shown = rows.map(withPlanCopy)
    this.plansCache = { rows: shown, at: Date.now() }
    return shown
  }

  forgetPlans() {
    this.plansCache = null
  }

  async plan(key: string) {
    const plans = await this.plans()
    const plan = plans.find((row) => row.key === key)
    if (!plan) throw new NotFoundException('Plan not found')
    return plan
  }

  async subscription(businessId: string): Promise<StoredSubscription | null> {
    const [row] = (await this.dataSource.query(
      `SELECT "plan_key" AS "planKey", "trial_ends_at" AS "trialEndsAt", "paid_until" AS "paidUntil",
         "is_lifetime" AS "isLifetime", "sms_extra" AS "smsExtra", "last_reminder" AS "lastReminder"
       FROM "business_subscriptions" WHERE "business_id" = $1`,
      [businessId],
    )) as StoredSubscription[]
    return row ?? null
  }

  async access(businessId: string, now = new Date()) {
    const subscription = await this.subscription(businessId)
    const access = resolveAccess(subscription, now)
    const plans = await this.plans()
    const plan =
      plans.find((row) => row.key === access.planKey) ??
      plans.find((row) => row.key === FREE_PLAN_KEY)
    if (!plan) throw new Error('No free plan in “plans”')

    return { access, plan, plans, subscription }
  }

  async accessView(businessId: string): Promise<PlanAccess> {
    const { access, plan, plans } = await this.access(businessId)
    return toAccessView(access, plan, plans)
  }

  async hasFeature(businessId: string, feature: PlanFeature) {
    const { plan } = await this.access(businessId)
    return hasFeature(plan, feature)
  }

  async assertFeature(businessId: string, feature: PlanFeature) {
    const { plan, plans } = await this.access(businessId)
    if (!hasFeature(plan, feature)) {
      throw new PlanRequiredException(featureLockedMessage(plans, feature))
    }
  }

  /** Refuses one more active master or branch past the plan's limit. */
  async assertRoom(businessId: string, limit: PlanLimit) {
    const { plan, plans } = await this.access(businessId)
    const current =
      limit === 'masters'
        ? await this.countMasters(businessId)
        : await this.countBranches(businessId)
    const problem = limitProblem(plans, plan, limit, current)
    if (problem) throw new PlanRequiredException(problem)
  }

  async countMasters(businessId: string, manager: EntityManager = this.dataSource.manager) {
    const [row] = (await manager.query(
      'SELECT count(*)::int AS "count" FROM "specialists" WHERE "business_id" = $1 AND "is_active"',
      [businessId],
    )) as { count: number }[]
    return row?.count ?? 0
  }

  async countBranches(businessId: string) {
    const [row] = (await this.dataSource.query(
      'SELECT count(*)::int AS "count" FROM "branches" WHERE "business_id" = $1 AND "is_active"',
      [businessId],
    )) as { count: number }[]
    return row?.count ?? 0
  }

  /** A new business: the trial of the paid plan (the public plan with trial days). */
  async startTrial(businessId: string, manager: EntityManager = this.dataSource.manager) {
    const plans = await this.plans()
    const trial = plans.find((plan) => plan.isPublic && plan.trialDays > 0)
    const planKey = trial?.key ?? FREE_PLAN_KEY
    const days = trial?.trialDays ?? 0
    await manager.query(
      `INSERT INTO "business_subscriptions" ("business_id", "plan_key", "trial_ends_at")
       VALUES ($1, $2, CASE WHEN $3::int > 0 THEN now() + make_interval(days => $3::int) END)
       ON CONFLICT ("business_id") DO NOTHING`,
      [businessId, planKey, days],
    )
  }

  /** A paid (or granted) period: months from the later of now, the paid end and the trial. */
  async extend(businessId: string, planKey: string, months: number, now = new Date()) {
    await this.plan(planKey)
    const subscription = await this.subscription(businessId)
    const until = extendUntil(subscription, now, months)
    await this.dataSource.query(
      `INSERT INTO "business_subscriptions" ("business_id", "plan_key", "paid_until", "is_lifetime")
       VALUES ($1, $2, $3, false)
       ON CONFLICT ("business_id") DO UPDATE SET "plan_key" = $2, "paid_until" = $3,
         "is_lifetime" = false, "updated_at" = now()`,
      [businessId, planKey, until],
    )
    return until
  }

  async makeLifetime(businessId: string, planKey: string) {
    await this.plan(planKey)
    await this.dataSource.query(
      `INSERT INTO "business_subscriptions" ("business_id", "plan_key", "is_lifetime")
       VALUES ($1, $2, true)
       ON CONFLICT ("business_id") DO UPDATE SET "plan_key" = $2, "is_lifetime" = true,
         "updated_at" = now()`,
      [businessId, planKey],
    )
  }

  async addSms(businessId: string, count: number) {
    await this.dataSource.query(
      `INSERT INTO "business_subscriptions" ("business_id", "plan_key", "is_lifetime", "sms_extra")
       VALUES ($1, $2, true, $3)
       ON CONFLICT ("business_id") DO UPDATE
         SET "sms_extra" = "business_subscriptions"."sms_extra" + $3, "updated_at" = now()`,
      [businessId, LEGACY_PLAN_KEY, count],
    )
  }

  async smsUsage(businessId: string, now = new Date()) {
    const { plan, subscription } = await this.access(businessId, now)
    const [row] = (await this.dataSource.query(
      'SELECT "sent" FROM "sms_usage" WHERE "business_id" = $1 AND "month" = $2',
      [businessId, usageMonth(now)],
    )) as { sent: number }[]
    const masters = await this.countMasters(businessId)

    return {
      sent: row?.sent ?? 0,
      allowance: smsAllowance(plan, masters),
      extra: subscription?.smsExtra ?? 0,
    }
  }

  /** SMS left this month with packs; null: no limit. */
  async smsLeft(businessId: string) {
    const usage = await this.smsUsage(businessId)
    if (usage.allowance === null) return null
    return Math.max(0, usage.allowance - usage.sent) + usage.extra
  }

  /**
   * One SMS of this business is about to go: counted in the month, then taken from a pack past the
   * plan's SMS. Optional messages (reminders, mailings, review requests) are refused past both;
   * a visit's confirmation or the salon's cancellation always goes and is still counted.
   */
  async takeSms(businessId: string, { isOptional }: { isOptional: boolean }) {
    const month = usageMonth(new Date())
    const count = () =>
      this.dataSource.query(
        `INSERT INTO "sms_usage" ("business_id", "month", "sent") VALUES ($1, $2, 1)
         ON CONFLICT ("business_id", "month") DO UPDATE SET "sent" = "sms_usage"."sent" + 1`,
        [businessId, month],
      )
    const usage = await this.smsUsage(businessId)
    if (usage.allowance === null || usage.sent < usage.allowance) {
      // Two sends racing for the last one may both pass: one SMS over is cheaper than a lock.
      await count()
      return true
    }
    const taken = returnedRows(
      await this.dataSource.query(
        `UPDATE "business_subscriptions" SET "sms_extra" = "sms_extra" - 1
         WHERE "business_id" = $1 AND "sms_extra" > 0 RETURNING "sms_extra"`,
        [businessId],
      ),
    )
    if (taken.length > 0 || !isOptional) {
      await count()
      return true
    }
    return false
  }

  async remember(businessId: string, key: string) {
    await this.dataSource.query(
      'UPDATE "business_subscriptions" SET "last_reminder" = $2 WHERE "business_id" = $1',
      [businessId, key],
    )
  }
}

const toPlanView = (plan: PlanRow): BillingPlan => ({
  key: plan.key,
  title: plan.title,
  description: plan.description,
  monthlyPrice: plan.monthlyPrice,
  includedMasters: plan.includedMasters,
  extraMasterPrice: plan.extraMasterPrice,
  maxMasters: plan.maxMasters,
  maxBranches: plan.maxBranches,
  smsPerMonth: plan.smsPerMonth,
  smsPerMaster: plan.smsPerMaster,
  features: plan.features as PlanFeature[],
  trialDays: plan.trialDays,
})

const toAccessView = (access: Access, plan: PlanRow, plans: PlanRow[]): PlanAccess => {
  const upgrade = plans
    .filter((row) => row.isPublic && row.monthlyPrice > 0)
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice)[0]
  return {
    planKey: plan.key,
    title: plan.title,
    status: access.status,
    endsAt: access.endsAt?.toISOString() ?? null,
    features: plan.features as PlanFeature[],
    upgradeTitle: upgrade?.title ?? null,
  }
}

export { PlanRequiredException, toAccessView, toPlanView }
