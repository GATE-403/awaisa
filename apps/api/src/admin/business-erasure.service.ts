import type { BusinessDeleted } from '@awaisa/contracts'
import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { CacheService } from '../cache/cache.service.js'
import { AdminService } from './admin.service.js'
import { archivedSlug, bookingsToCancel } from './business-erasure.js'

type Row = Record<string, unknown>

// 'Delete business': what stays (the books) and what goes is in `business-erasure.ts`.
@Injectable()
export class BusinessErasureService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly admin: AdminService,
    private readonly cache: CacheService,
  ) {}

  async delete(business: Business): Promise<BusinessDeleted> {
    // Visits ahead are cancelled the salon's usual way first: each client hears after the undo
    // window and a deposit is refunded by `settlePayments` (the salon cancelled).
    const upcoming = (await this.dataSource.query(
      `SELECT "id", "status", "starts_at" AS "startsAt" FROM "bookings"
       WHERE "business_id" = $1 AND "status" = 'confirmed' AND "starts_at" > now()`,
      [business.id],
    )) as Row[]
    const toCancel = bookingsToCancel(
      upcoming.map((row) => ({
        id: String(row.id),
        status: String(row.status),
        startsAt: new Date(row.startsAt as string),
      })),
      new Date(),
    )
    for (const id of toCancel) await this.admin.cancelBooking(business, id)

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE "businesses" SET "deleted_at" = now(), "is_published" = false, "slug" = $2,
           "birthday_greeting" = NULL
         WHERE "id" = $1`,
        [business.id, archivedSlug(business.id, new Date())],
      )
      // Masters lose 'My day' and the boards, services leave every list and job.
      await manager.query('UPDATE "specialists" SET "is_active" = false WHERE "business_id" = $1', [
        business.id,
      ])
      await manager.query('UPDATE "services" SET "is_active" = false WHERE "business_id" = $1', [
        business.id,
      ])
      // A visit that just ended gets no 'How did it go?' from a place that is gone.
      await manager.query(
        `UPDATE "bookings" SET "review_requested_at" = now()
         WHERE "business_id" = $1 AND "review_requested_at" IS NULL`,
        [business.id],
      )
      await manager.query(
        `UPDATE "waitlist_entries" SET "status" = 'cancelled'
         WHERE "business_id" = $1 AND "status" IN ('waiting', 'notified')`,
        [business.id],
      )
      await manager.query(
        `DELETE FROM "master_follows" f USING "specialists" sp
         WHERE sp."id" = f."specialist_id" AND sp."business_id" = $1`,
        [business.id],
      )
      await manager.query('DELETE FROM "calendar_feeds" WHERE "business_id" = $1', [business.id])
      await manager.query('DELETE FROM "telegram_link_codes" WHERE "business_id" = $1', [
        business.id,
      ])
      await manager.query('DELETE FROM "telegram_chats" WHERE "business_id" = $1', [business.id])
      // The team (the owner too) loses access; the archive is only the books.
      await manager.query('DELETE FROM "business_members" WHERE "business_id" = $1', [business.id])
    })
    await this.cache.bump(['catalog', 'availability'])

    return { slug: business.slug, cancelledBookings: toCancel.length }
  }
}
