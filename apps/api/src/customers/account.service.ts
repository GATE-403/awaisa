import type { AccountDeleted, AccountExport } from '@awaisa/contracts'
import { ConflictException, Injectable, Logger } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BookingsService } from '../bookings/bookings.service.js'
import { CacheService } from '../cache/cache.service.js'
import { returnedRows } from '../common/sql.js'
import { LoyaltyService } from '../loyalty/loyalty.service.js'
import { StorageService } from '../media/storage.service.js'
import { WaitlistService } from '../waitlist/waitlist.service.js'
import {
  ANONYMOUS_AUTHOR,
  bookingsToCancel,
  soleOwnedBusinesses,
  soleOwnerMessage,
} from './account-erasure.js'
import type { Customer } from './customer.entity.js'

type Row = Record<string, unknown>

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null)

// «Скачать мои данные» and «Удалить аккаунт» (the law on personal data): what the platform keeps
// about a client, and taking it away. What stays and why is in `account-erasure.ts`.
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bookings: BookingsService,
    private readonly loyalty: LoyaltyService,
    private readonly waitlist: WaitlistService,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
  ) {}

  async export(customer: Customer): Promise<AccountExport> {
    const [certificates, subscriptionOrders, certificateOrders, receipts] = await Promise.all([
      this.query(
        `SELECT bz."slug", bz."name", g."code", g."amount", g."balance", to_char(g."expires_on", 'YYYY-MM-DD') AS "expiresOn",
           g."created_at" AS "createdAt"
         FROM "gift_certificates" g JOIN "businesses" bz ON bz."id" = g."business_id"
         WHERE g."phone" = $1 ORDER BY g."created_at" DESC`,
        [customer.phone],
      ),
      this.query(
        `SELECT bz."slug", bz."name", o."title", o."visits", o."amount", o."status",
           o."created_at" AS "createdAt", o."paid_at" AS "paidAt"
         FROM "subscription_orders" o JOIN "businesses" bz ON bz."id" = o."business_id"
         WHERE o."customer_id" = $1 OR o."phone" = $2 ORDER BY o."created_at" DESC`,
        [customer.id, customer.phone],
      ),
      this.query(
        `SELECT bz."slug", bz."name", o."amount", o."recipient_name" AS "recipientName", o."status",
           o."created_at" AS "createdAt", o."paid_at" AS "paidAt"
         FROM "certificate_orders" o JOIN "businesses" bz ON bz."id" = o."business_id"
         WHERE o."customer_id" = $1 OR o."buyer_phone" = $2 ORDER BY o."created_at" DESC`,
        [customer.id, customer.phone],
      ),
      // Fiscal receipts of one's own visits (the address on the tax site, not internal ids).
      this.query(
        `SELECT bz."slug", bz."name", f."kind", f."status", f."total", f."fiscal_number" AS "fiscalNumber",
           f."provider_url" AS "url", f."issued_at" AS "issuedAt"
         FROM "fiscal_receipts" f
         JOIN "bookings" b ON b."id" = f."booking_id"
         JOIN "businesses" bz ON bz."id" = f."business_id"
         WHERE b."customer_phone" = $1 ORDER BY f."created_at" DESC`,
        [customer.phone],
      ),
    ])
    const [bookings, reviews, questions, loyalty, waitlist, master, push, telegram, chats, refs] =
      await Promise.all([
        this.bookings.listForCustomer(customer),
        this.query(
          `SELECT r."id", r."rating", r."comment", r."author_name" AS "authorName", r."reply",
             r."replied_at" AS "repliedAt", r."created_at" AS "createdAt", r."service_id" AS "serviceId",
             COALESCE(s."name", '') AS "serviceName", COALESCE(sp."name", '') AS "specialistName",
             COALESCE((SELECT array_agg(rp."url" ORDER BY rp."created_at") FROM "review_photos" rp
               WHERE rp."review_id" = r."id"), '{}') AS "photos",
             bz."slug", bz."name" AS "businessName"
           FROM "reviews" r
           JOIN "bookings" b ON b."id" = r."booking_id"
           JOIN "businesses" bz ON bz."id" = r."business_id"
           LEFT JOIN "services" s ON s."id" = r."service_id"
           LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
           WHERE b."customer_phone" = $1 AND r."anonymized_at" IS NULL
           ORDER BY r."created_at" DESC`,
          [customer.phone],
        ),
        this.query(
          `SELECT q."text", q."answer", q."created_at" AS "createdAt", bz."slug", bz."name"
           FROM "business_questions" q JOIN "businesses" bz ON bz."id" = q."business_id"
           WHERE q."customer_id" = $1 ORDER BY q."created_at" DESC`,
          [customer.id],
        ),
        this.loyalty.forCustomer(customer.phone),
        this.waitlist.listForCustomer(customer),
        customer.favoriteMasterId
          ? this.query(
              `SELECT sp."id", sp."name", bz."name" AS "business" FROM "specialists" sp
               JOIN "businesses" bz ON bz."id" = sp."business_id" WHERE sp."id" = $1`,
              [customer.favoriteMasterId],
            )
          : Promise.resolve([]),
        this.query(
          `SELECT "kind", "user_agent" AS "userAgent", "created_at" AS "createdAt",
             "last_success_at" AS "lastSuccessAt"
           FROM "push_subscriptions" WHERE "customer_id" = $1 ORDER BY "created_at"`,
          [customer.id],
        ),
        this.query(
          'SELECT "created_at" AS "createdAt" FROM "client_telegram_chats" WHERE "phone" = $1',
          [customer.phone],
        ),
        this.query(
          `SELECT bz."name" AS "business", tc."username", tc."created_at" AS "createdAt"
           FROM "telegram_chats" tc JOIN "businesses" bz ON bz."id" = tc."business_id"
           WHERE tc."customer_id" = $1 ORDER BY tc."created_at"`,
          [customer.id],
        ),
        this.query(
          `SELECT EXISTS (SELECT 1 FROM "referrals" WHERE "friend_phone" = $1) AS "invitedBy",
             (SELECT COUNT(*)::int FROM "referrals" WHERE "referrer_phone" = $1) AS "friendsInvited"`,
          [customer.phone],
        ),
      ])
    const [favoriteMaster] = master
    const [telegramLink] = telegram
    const follows = await this.query(
      `SELECT sp."name", bz."name" AS "business", f."notify_works" AS "notifyWorks",
         f."created_at" AS "since"
       FROM "master_follows" f
       JOIN "specialists" sp ON sp."id" = f."specialist_id"
       JOIN "businesses" bz ON bz."id" = sp."business_id"
       WHERE f."customer_id" = $1 ORDER BY f."created_at"`,
      [customer.id],
    )
    const [referrals] = refs

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        name: customer.name,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl ?? null,
        handle: customer.handle ?? null,
        status: customer.status,
        statusEmoji: customer.statusEmoji,
        about: customer.about,
        accent: customer.accent ?? null,
        socialLinks: customer.socialLinks ?? {},
        featuredBadges: customer.featuredBadges ?? [],
        isPublic: customer.isPublic,
        showPlaces: customer.showPlaces,
        createdAt: new Date(customer.createdAt).toISOString(),
      },
      bookings,
      reviews: reviews.map((row) => ({
        id: String(row.id),
        rating: Number(row.rating),
        comment: String(row.comment ?? ''),
        authorName: String(row.authorName ?? ''),
        reply: (row.reply as string | null) ?? null,
        repliedAt: iso(row.repliedAt),
        createdAt: iso(row.createdAt) ?? '',
        serviceId: (row.serviceId as string | null) ?? null,
        serviceName: String(row.serviceName),
        specialistName: String(row.specialistName),
        photos: (row.photos as string[] | null) ?? [],
        business: { slug: String(row.slug), name: String(row.businessName) },
      })),
      questions: questions.map((row) => ({
        business: { slug: String(row.slug), name: String(row.name) },
        text: String(row.text),
        answer: (row.answer as string | null) ?? null,
        createdAt: iso(row.createdAt) ?? '',
      })),
      loyalty,
      certificates: certificates.map((row) => ({
        business: { slug: String(row.slug), name: String(row.name) },
        code: String(row.code),
        amount: Number(row.amount),
        balance: Number(row.balance),
        expiresOn: row.expiresOn ? String(row.expiresOn).slice(0, 10) : null,
        createdAt: iso(row.createdAt) ?? '',
      })),
      subscriptionOrders: subscriptionOrders.map((row) => ({
        business: { slug: String(row.slug), name: String(row.name) },
        title: String(row.title),
        visits: Number(row.visits),
        amount: Number(row.amount),
        status: String(row.status),
        createdAt: iso(row.createdAt) ?? '',
        paidAt: iso(row.paidAt),
      })),
      certificateOrders: certificateOrders.map((row) => ({
        business: { slug: String(row.slug), name: String(row.name) },
        amount: Number(row.amount),
        recipientName: String(row.recipientName ?? ''),
        status: String(row.status),
        createdAt: iso(row.createdAt) ?? '',
        paidAt: iso(row.paidAt),
      })),
      receipts: receipts.map((row) => ({
        business: { slug: String(row.slug), name: String(row.name) },
        kind: row.kind === 'refund' ? ('refund' as const) : ('sale' as const),
        status: String(row.status),
        total: Number(row.total),
        fiscalNumber: (row.fiscalNumber as string | null) ?? null,
        url: (row.url as string | null) ?? null,
        issuedAt: iso(row.issuedAt),
      })),
      waitlist,
      favorites: {
        master: favoriteMaster
          ? {
              id: String(favoriteMaster.id),
              name: String(favoriteMaster.name),
              business: String(favoriteMaster.business),
            }
          : null,
        follows: follows.map((row) => ({
          name: String(row.name),
          business: String(row.business),
          notifyWorks: Boolean(row.notifyWorks),
          since: iso(row.since) ?? '',
        })),
      },
      notifications: {
        push: push.map((row) => ({
          kind: String(row.kind ?? 'web'),
          userAgent: String(row.userAgent ?? ''),
          createdAt: iso(row.createdAt) ?? '',
          lastSuccessAt: iso(row.lastSuccessAt),
        })),
        telegram: { isLinked: Boolean(telegramLink), linkedAt: iso(telegramLink?.createdAt) },
        businessChats: chats.map((row) => ({
          business: String(row.business),
          username: String(row.username ?? ''),
          createdAt: iso(row.createdAt) ?? '',
        })),
      },
      referrals: {
        invitedBy: Boolean(referrals?.invitedBy),
        friendsInvited: Number(referrals?.friendsInvited ?? 0),
      },
    }
  }

  async delete(customer: Customer): Promise<AccountDeleted> {
    const memberships = await this.query(
      `SELECT bz."name" AS "businessName", m."role",
         (SELECT COUNT(*)::int FROM "business_members" o
           WHERE o."business_id" = m."business_id" AND o."role" = 'owner') AS "owners"
       FROM "business_members" m JOIN "businesses" bz ON bz."id" = m."business_id"
       WHERE m."customer_id" = $1`,
      [customer.id],
    )
    const soleOwned = soleOwnedBusinesses(
      memberships.map((row) => ({
        businessName: String(row.businessName),
        role: String(row.role),
        owners: Number(row.owners),
      })),
    )
    if (soleOwned.length > 0) throw new ConflictException(soleOwnerMessage(soleOwned))

    // Visits ahead on the account's own number are cancelled the usual way: the place hears of it
    // after the undo window, a deposit follows the refund rule. Visits booked for someone else
    // stay theirs.
    const upcoming = await this.query(
      `SELECT "id", "status", "starts_at" AS "startsAt" FROM "bookings"
       WHERE "customer_phone" = $1 AND "status" = 'confirmed' AND "starts_at" > now()`,
      [customer.phone],
    )
    const toCancel = bookingsToCancel(
      upcoming.map((row) => ({
        id: String(row.id),
        status: String(row.status),
        startsAt: new Date(row.startsAt as string),
      })),
      new Date(),
    )
    for (const id of toCancel) await this.bookings.cancelForCustomer(id, customer)

    const slugs = await this.dataSource.transaction(async (manager) => {
      // Reviews stay with the places, without the person (their visits were on this number).
      const anonymized = returnedRows(
        await manager.query(
          `UPDATE "reviews" r SET "anonymized_at" = now(), "author_name" = $2
           FROM "bookings" b, "businesses" bz
           WHERE b."id" = r."booking_id" AND bz."id" = r."business_id"
             AND b."customer_phone" = $1 AND r."anonymized_at" IS NULL
           RETURNING bz."slug"`,
          [customer.phone, ANONYMOUS_AUTHOR],
        ),
      )
      await manager.query(
        'UPDATE "business_questions" SET "author_name" = $2 WHERE "customer_id" = $1',
        [customer.id, ANONYMOUS_AUTHOR],
      )
      // Bookings are the businesses' books: they stay, no longer tied to the account.
      await manager.query('UPDATE "bookings" SET "customer_id" = NULL WHERE "customer_id" = $1', [
        customer.id,
      ])
      // Online subscription purchases are the businesses' sales too: kept, no longer the account's.
      await manager.query(
        'UPDATE "subscription_orders" SET "customer_id" = NULL WHERE "customer_id" = $1',
        [customer.id],
      )
      await manager.query(
        `UPDATE "waitlist_entries" SET "status" = 'cancelled'
         WHERE ("customer_id" = $1 OR "customer_phone" = $2) AND "status" IN ('waiting', 'notified')`,
        [customer.id, customer.phone],
      )
      await manager.query('DELETE FROM "client_telegram_chats" WHERE "phone" = $1', [
        customer.phone,
      ])
      await manager.query('DELETE FROM "telegram_logins" WHERE "phone" = $1', [customer.phone])
      await manager.query('DELETE FROM "telegram_chats" WHERE "customer_id" = $1', [customer.id])
      await manager.query(
        'DELETE FROM "referrals" WHERE "referrer_phone" = $1 OR "friend_phone" = $1',
        [customer.phone],
      )
      await manager.query('DELETE FROM "otp_codes" WHERE "phone" = $1', [customer.phone])
      // Sessions, push subscriptions (web and Expo), staff memberships and link codes go with it (ON DELETE CASCADE).
      await manager.query('DELETE FROM "customers" WHERE "id" = $1', [customer.id])

      return [...new Set(anonymized.map((row) => String(row.slug)))]
    })

    if (customer.avatarUrl) {
      await this.storage.remove(customer.avatarUrl).catch((error: unknown) => {
        this.logger.warn(`Avatar of a deleted account not removed: ${String(error)}`)
      })
    }
    await this.cache.bump(['catalog'])

    return { slugs, cancelledBookings: toCancel.length }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
