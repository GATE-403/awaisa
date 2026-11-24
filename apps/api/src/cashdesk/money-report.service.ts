import type { AnalyticsDays, MoneyReport } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { visitPrice } from '../bookings/visit-sql.js'
import type { Business } from '../businesses/business.entity.js'
import { addDays, businessDateTimeToUtc, toBusinessParts } from '../common/business-time.js'
import { toNumber } from '../common/sql.js'
import { changeOf, profitOf, roundMoney } from './cash-math.js'

type Row = Record<string, unknown>

// The same rules as 'Analytics''s revenue: a visit counts unless it was a no-show and earns
// what was paid, or the price minus its discount when nobody marked the payment.
const DONE = `b."status" = 'confirmed' AND b."outcome" IS DISTINCT FROM 'no_show'`
const EARNED = `COALESCE(b."paid_amount", ${visitPrice()} - COALESCE(b."discount_amount", 0))`
const MATERIALS = `(SELECT COALESCE(SUM(m."cost"), 0) FROM "stock_movements" m
  WHERE m."booking_id" = b."id" AND m."kind" = 'use')`
const LOCAL_VISIT = `(b."starts_at" AT TIME ZONE 'UTC' + interval '6 hours')::date`
const LOCAL_SALE = `(x."created_at" AT TIME ZONE 'UTC' + interval '6 hours')::date`
const LOCAL_CERTIFICATE = `(g."paid_at" AT TIME ZONE 'UTC' + interval '6 hours')::date`
const LOCAL_SUBSCRIPTION = `(c."created_at" AT TIME ZONE 'UTC' + interval '6 hours')::date`

/**
 * 'Profit': revenue from services, products and subscriptions sold (a visit paid by a
 * subscription earns 0, so its money is counted once, on the day of the sale), minus the materials visits used, what the
 * sold products cost and the expenses, over a period and the same stretch before.
 */
@Injectable()
export class MoneyReportService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async report(business: Business, days: number): Promise<MoneyReport> {
    const today = toBusinessParts(new Date()).dateKey
    const firstDay = addDays(today, -(days - 1))
    const previousFirst = addDays(firstDay, -days)
    const [current, previous, byCategory, products, daily] = await Promise.all([
      this.totals(business.id, firstDay, today),
      this.totals(business.id, previousFirst, addDays(firstDay, -1)),
      this.query(
        `SELECT "category", SUM("amount") AS "amount" FROM "expenses"
         WHERE "business_id" = $1 AND "date" BETWEEN $2 AND $3
         GROUP BY "category" ORDER BY "amount" DESC`,
        [business.id, firstDay, today],
      ),
      this.query(
        `SELECT i."name", SUM(i."quantity") AS "quantity", SUM(i."quantity" * i."price") AS "revenue"
         FROM "sale_items" i JOIN "sales" x ON x."id" = i."sale_id"
         WHERE x."business_id" = $1 AND x."cancelled_at" IS NULL
           AND x."created_at" >= $2 AND x."created_at" < $3
         GROUP BY i."name" ORDER BY "revenue" DESC LIMIT 20`,
        [business.id, ...this.range(firstDay, today)],
      ),
      this.daily(business.id, firstDay, today),
    ])
    const profit = profitOf(current)
    const previousProfit = profitOf(previous)
    return {
      period: { days: days as AnalyticsDays, from: firstDay, to: today },
      servicesRevenue: current.servicesRevenue,
      productsRevenue: current.productsRevenue,
      subscriptionsRevenue: current.subscriptionsRevenue,
      subscriptionsSold: current.subscriptionsSold,
      certificatesRevenue: current.certificatesRevenue,
      revenue: roundMoney(
        current.servicesRevenue +
          current.productsRevenue +
          current.subscriptionsRevenue +
          current.certificatesRevenue,
      ),
      materialsCost: current.materialsCost,
      productsCost: current.productsCost,
      expenses: current.expenses,
      profit,
      previousProfit,
      profitChange: changeOf(profit, previousProfit),
      expensesByCategory: byCategory.map((row) => ({
        category: String(row.category),
        amount: toNumber(row.amount),
      })),
      products: products.map((row) => ({
        name: String(row.name),
        quantity: toNumber(row.quantity),
        revenue: toNumber(row.revenue),
      })),
      daily,
    }
  }

  /** From the first day's start to the end of the last day, in business time. */
  private range(firstDay: string, lastDay: string) {
    return [businessDateTimeToUtc(firstDay, 0), businessDateTimeToUtc(addDays(lastDay, 1), 0)]
  }

  private async totals(businessId: string, firstDay: string, lastDay: string) {
    const [from, to] = this.range(firstDay, lastDay)
    const [row] = await this.query(
      `SELECT
         (SELECT COALESCE(SUM(${EARNED}), 0) FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
         ) AS "servicesRevenue",
         (SELECT COALESCE(SUM(${MATERIALS}), 0) FROM "bookings" b
           WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
         ) AS "materialsCost",
         (SELECT COALESCE(SUM(x."total"), 0) FROM "sales" x
           WHERE x."business_id" = $1 AND x."cancelled_at" IS NULL
             AND x."created_at" >= $2 AND x."created_at" < $3) AS "productsRevenue",
         (SELECT COALESCE(SUM(x."cost"), 0) FROM "sales" x
           WHERE x."business_id" = $1 AND x."cancelled_at" IS NULL
             AND x."created_at" >= $2 AND x."created_at" < $3) AS "productsCost",
         (SELECT COALESCE(SUM(c."price_paid"), 0) FROM "client_subscriptions" c
           WHERE c."business_id" = $1 AND c."created_at" >= $2 AND c."created_at" < $3
         ) AS "subscriptionsRevenue",
         (SELECT COUNT(*) FROM "client_subscriptions" c
           WHERE c."business_id" = $1 AND c."created_at" >= $2 AND c."created_at" < $3
         ) AS "subscriptionsSold",
         (SELECT COALESCE(SUM(g."amount"), 0) FROM "certificate_orders" g
           WHERE g."business_id" = $1 AND g."status" = 'paid'
             AND g."paid_at" >= $2 AND g."paid_at" < $3) AS "certificatesRevenue",
         (SELECT COALESCE(SUM("amount"), 0) FROM "expenses"
           WHERE "business_id" = $1 AND "date" BETWEEN $4 AND $5) AS "expenses"`,
      [businessId, from, to, firstDay, lastDay],
    )
    return {
      servicesRevenue: toNumber(row?.servicesRevenue),
      productsRevenue: toNumber(row?.productsRevenue),
      materialsCost: toNumber(row?.materialsCost),
      productsCost: toNumber(row?.productsCost),
      subscriptionsRevenue: toNumber(row?.subscriptionsRevenue),
      subscriptionsSold: toNumber(row?.subscriptionsSold),
      // Money in on the day a gift certificate was paid online; spending it later is not
      // counted again (a visit's paid amount leaves out what the certificate covered).
      certificatesRevenue: toNumber(row?.certificatesRevenue),
      expenses: toNumber(row?.expenses),
    }
  }

  // Every day of the period, so the chart has no gaps.
  private async daily(businessId: string, firstDay: string, lastDay: string) {
    const [from, to] = this.range(firstDay, lastDay)
    const rows = await this.query(
      `WITH visits AS (
         SELECT to_char(${LOCAL_VISIT}, 'YYYY-MM-DD') AS "date",
           SUM(${EARNED}) AS "revenue", SUM(${MATERIALS}) AS "cost"
         FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
         WHERE b."business_id" = $1 AND ${DONE} AND b."starts_at" >= $2 AND b."starts_at" < $3
         GROUP BY 1
       ), sold AS (
         SELECT to_char(${LOCAL_SALE}, 'YYYY-MM-DD') AS "date", SUM(x."total") AS "revenue",
           SUM(x."cost") AS "cost"
         FROM "sales" x WHERE x."business_id" = $1 AND x."cancelled_at" IS NULL
           AND x."created_at" >= $2 AND x."created_at" < $3
         GROUP BY 1
       ), subscribed AS (
         SELECT to_char(${LOCAL_SUBSCRIPTION}, 'YYYY-MM-DD') AS "date", SUM(c."price_paid") AS "revenue"
         FROM "client_subscriptions" c WHERE c."business_id" = $1
           AND c."created_at" >= $2 AND c."created_at" < $3
         GROUP BY 1
       ), gifted AS (
         SELECT to_char(${LOCAL_CERTIFICATE}, 'YYYY-MM-DD') AS "date", SUM(g."amount") AS "revenue"
         FROM "certificate_orders" g WHERE g."business_id" = $1 AND g."status" = 'paid'
           AND g."paid_at" >= $2 AND g."paid_at" < $3
         GROUP BY 1
       ), spent AS (
         SELECT to_char("date", 'YYYY-MM-DD') AS "date", SUM("amount") AS "amount"
         FROM "expenses" WHERE "business_id" = $1 AND "date" BETWEEN $4 AND $5
         GROUP BY 1
       )
       SELECT d."date",
         COALESCE(v."revenue", 0) + COALESCE(o."revenue", 0) + COALESCE(a."revenue", 0)
           + COALESCE(g."revenue", 0) AS "revenue",
         COALESCE(v."cost", 0) + COALESCE(o."cost", 0) AS "cost", COALESCE(e."amount", 0) AS "expenses"
       FROM (SELECT "date" FROM visits UNION SELECT "date" FROM sold
         UNION SELECT "date" FROM subscribed UNION SELECT "date" FROM gifted
         UNION SELECT "date" FROM spent) d
       LEFT JOIN visits v ON v."date" = d."date"
       LEFT JOIN sold o ON o."date" = d."date"
       LEFT JOIN subscribed a ON a."date" = d."date"
       LEFT JOIN gifted g ON g."date" = d."date"
       LEFT JOIN spent e ON e."date" = d."date"`,
      [businessId, from, to, firstDay, lastDay],
    )
    const byDate = new Map(rows.map((row) => [String(row.date), row]))
    const total = Math.round(
      (businessDateTimeToUtc(lastDay, 0).getTime() - businessDateTimeToUtc(firstDay, 0).getTime()) /
        86_400_000,
    )
    return Array.from({ length: total + 1 }, (_, offset) => {
      const date = addDays(firstDay, offset)
      const row = byDate.get(date)
      const revenue = toNumber(row?.revenue)
      const expenses = toNumber(row?.expenses)
      return {
        date,
        revenue,
        expenses,
        profit: roundMoney(revenue - toNumber(row?.cost) - expenses),
      }
    })
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
