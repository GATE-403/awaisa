import type { SettingsSummary } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { toBusinessParts } from '../common/business-time.js'

/**
 * What each settings row says on its right, like iOS Settings («Акции · 1 действует», «Склад ·
 * 2 заканчиваются»), read in one query. Branches, hours, services and masters the cabinet already
 * has from the business and its catalog.
 */
@Injectable()
export class SettingsSummaryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async get(business: Business): Promise<SettingsSummary> {
    const today = toBusinessParts(new Date()).dateKey
    const [row] = (await this.dataSource.query(
      `SELECT
         (SELECT COUNT(*) FROM "business_members" WHERE "business_id" = $1)::int AS "team",
         (SELECT COUNT(*) FROM "telegram_chats" WHERE "business_id" = $1)::int AS "telegramChats",
         (SELECT COUNT(*) FROM "promotions" WHERE "business_id" = $1 AND "is_active"
             AND ("starts_on" IS NULL OR "starts_on" <= $2::date)
             AND ("ends_on" IS NULL OR "ends_on" >= $2::date))::int AS "activePromotions",
         (SELECT "bonus_percent" FROM "businesses" WHERE "id" = $1) AS "bonusPercent",
         (SELECT COUNT(*) FROM "subscription_plans"
           WHERE "business_id" = $1 AND "is_active")::int AS "plans",
         (SELECT COUNT(*) FROM "stock_items" WHERE "business_id" = $1)::int AS "stockItems",
         (SELECT COUNT(*) FROM "stock_items" WHERE "business_id" = $1
             AND "min_quantity" IS NOT NULL AND "quantity" <= "min_quantity")::int AS "lowStock"`,
      [business.id, today],
    )) as Record<string, unknown>[]

    return {
      team: Number(row?.team ?? 0),
      telegramChats: Number(row?.telegramChats ?? 0),
      activePromotions: Number(row?.activePromotions ?? 0),
      bonusPercent:
        row?.bonusPercent === null || row?.bonusPercent === undefined
          ? null
          : Number(row.bonusPercent),
      plans: Number(row?.plans ?? 0),
      stockItems: Number(row?.stockItems ?? 0),
      lowStock: Number(row?.lowStock ?? 0),
    }
  }
}
