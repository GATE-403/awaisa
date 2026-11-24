import type {
  ModerationAction,
  ModerationDecision,
  ModerationItem,
  ModerationPreview,
  ReportReason,
  ReportTargetType,
} from '@awaisa/contracts'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { publicIdSql, saltOf } from '../common/public-id.js'
import { returnedRows } from '../common/sql.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { StorageService } from '../media/storage.service.js'
import { WorkPhotosService } from '../media/work-photos.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { photoModeratedText } from '../telegram/telegram-messages.js'
import { canApply, reporterKey, shouldAutoHide } from './moderation-rules.js'

type Row = Record<string, unknown>

/** The reported thing as the queue needs it: what to show and where it lives. */
type Target = {
  preview: ModerationPreview
  isHidden: boolean
  /** Photos: the place, for the owner's notice; profiles: the phone the person is known by. */
  businessId: string | null
  phone: string | null
  specialistId: string | null
}

const QUEUE_LIMIT = 50

const text = (value: unknown) => (value === null || value === undefined ? null : String(value))

/**
 * Reports from viewers and what platform admins decide about them. A thing reported by three
 * different devices or accounts hides itself until a moderator looks (`shouldAutoHide`); 'Keep'
 * settles the reports and stops that for good, 'Hide', 'Delete' and, for people,
 * 'Block' act on it. Every decision is kept in a journal with what the thing looked like.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
    private readonly workPhotos: WorkPhotosService,
    private readonly storage: StorageService,
    private readonly telegram: TelegramBotService,
  ) {}

  isAdmin(customer: Customer) {
    return this.config.get('ADMIN_PHONES', { infer: true }).includes(customer.phone)
  }

  async report(
    input: {
      targetType: ReportTargetType
      targetId: string
      reason: ReportReason
      session?: string
    },
    customer: Customer | null,
  ) {
    const reporter = reporterKey(customer?.id ?? null, input.session ?? null)
    if (!reporter) throw new BadRequestException('Could not send the report, refresh the page')
    const target = await this.load(input.targetType, input.targetId)
    if (!target) throw new NotFoundException('Could not find what is being reported')

    await this.query(
      `INSERT INTO "reports" ("target_type", "target_id", "reason", "reporter", "customer_id")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("target_type", "target_id", "reporter") WHERE "resolved_at" IS NULL DO NOTHING`,
      [input.targetType, input.targetId, input.reason, reporter, customer?.id ?? null],
    )
    const reporters = await this.openReports(input.targetType, input.targetId)
    if (input.targetType === 'photo') {
      // The cabinet still shows the count beside a photo.
      await this.query('UPDATE "work_photos" SET "reports" = $2 WHERE "id" = $1', [
        input.targetId,
        reporters,
      ])
    }
    const isKept = await this.isKept(input.targetType, input.targetId)
    if (shouldAutoHide({ reporters, isHidden: target.isHidden, isKept })) {
      await this.hide(input.targetType, input.targetId, target, false)
    }
  }

  /** Open reports grouped by thing, most reported first, each with its preview. */
  async queue(): Promise<{ items: ModerationItem[] }> {
    const rows = await this.query(
      `SELECT o."target_type" AS "targetType", o."target_id" AS "targetId",
         COUNT(*)::int AS "reports", MAX(o."created_at") AS "lastReportedAt",
         (SELECT json_agg(json_build_object('reason', g."reason", 'count', g."count") ORDER BY g."count" DESC)
            FROM (SELECT r."reason", COUNT(*)::int AS "count" FROM "reports" r
                  WHERE r."resolved_at" IS NULL AND r."target_type" = o."target_type"
                    AND r."target_id" = o."target_id"
                  GROUP BY r."reason") g) AS "reasons"
       FROM "reports" o
       WHERE o."resolved_at" IS NULL
       GROUP BY o."target_type", o."target_id"
       ORDER BY "reports" DESC, "lastReportedAt" DESC
       LIMIT ${QUEUE_LIMIT}`,
      [],
    )
    const items = await Promise.all(
      rows.map(async (row) => {
        const targetType = String(row.targetType) as ReportTargetType
        const targetId = String(row.targetId)
        const [target, isKept] = await Promise.all([
          this.load(targetType, targetId),
          this.isKept(targetType, targetId),
        ])
        return {
          targetType,
          targetId,
          reports: Number(row.reports),
          reasons: (row.reasons as { reason: ReportReason; count: number }[] | null) ?? [],
          lastReportedAt: new Date(row.lastReportedAt as string).toISOString(),
          isHidden: target?.isHidden ?? false,
          isKept,
          preview: target?.preview ?? null,
        }
      }),
    )
    return { items }
  }

  async decide(
    admin: Customer,
    input: { targetType: ReportTargetType; targetId: string; action: ModerationAction },
  ): Promise<ModerationDecision> {
    const { targetType, targetId, action } = input
    if (!canApply(targetType, action)) {
      throw new BadRequestException("Only a profile's author can be blocked")
    }
    const target = await this.load(targetType, targetId)
    // Gone already (the owner deleted the photo): the reports can still be settled.
    if (!target && action !== 'keep' && action !== 'delete') {
      throw new NotFoundException('This is already gone')
    }
    const reports = await this.openReports(targetType, targetId)

    if (target) {
      if (action === 'keep') await this.show(targetType, targetId, target)
      if (action === 'hide') await this.hide(targetType, targetId, target, true)
      if (action === 'delete') await this.remove(targetType, targetId, target)
      if (action === 'block') await this.block(target)
    }

    await this.query(
      `UPDATE "reports" SET "resolved_at" = now()
       WHERE "target_type" = $1 AND "target_id" = $2 AND "resolved_at" IS NULL`,
      [targetType, targetId],
    )
    const [row] = await this.query(
      `INSERT INTO "moderation_decisions" ("target_type", "target_id", "action", "reports", "preview", "admin_id")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id", "created_at" AS "createdAt"`,
      [targetType, targetId, action, reports, target?.preview ?? {}, admin.id],
    )
    return {
      id: String(row?.id),
      targetType,
      targetId,
      action,
      reports,
      preview: target?.preview ?? null,
      adminName: admin.name || admin.phone,
      createdAt: new Date(row?.createdAt as string).toISOString(),
    }
  }

  /** The journal: what was decided, by whom and what the thing looked like then. */
  async log(limit: number): Promise<{ items: ModerationDecision[] }> {
    const rows = await this.query(
      `SELECT d."id", d."target_type" AS "targetType", d."target_id" AS "targetId", d."action",
         d."reports", d."preview", d."created_at" AS "createdAt",
         COALESCE(NULLIF(c."name", ''), c."phone", '') AS "adminName"
       FROM "moderation_decisions" d
       LEFT JOIN "customers" c ON c."id" = d."admin_id"
       ORDER BY d."created_at" DESC LIMIT $1`,
      [limit],
    )
    return {
      items: rows.map((row) => {
        const preview = row.preview as ModerationPreview | Record<string, never> | null
        return {
          id: String(row.id),
          targetType: String(row.targetType) as ReportTargetType,
          targetId: String(row.targetId),
          action: String(row.action) as ModerationAction,
          reports: Number(row.reports),
          preview: preview && 'title' in preview ? (preview as ModerationPreview) : null,
          adminName: String(row.adminName ?? ''),
          createdAt: new Date(row.createdAt as string).toISOString(),
        }
      }),
    }
  }

  private async show(type: ReportTargetType, id: string, target: Target) {
    if (type === 'photo') {
      await this.query(
        `UPDATE "work_photos" SET "is_hidden" = false, "is_moderated" = false, "reports" = 0
         WHERE "id" = $1`,
        [id],
      )
    }
    if (type === 'review') {
      await this.query('UPDATE "reviews" SET "is_hidden" = false WHERE "id" = $1', [id])
      await this.refreshRating(target.specialistId)
    }
    if (type === 'profile' && target.phone) {
      await this.query('UPDATE "moderated_people" SET "hidden_at" = NULL WHERE "phone" = $1', [
        target.phone,
      ])
    }
  }

  /** By a moderator (`isModerator`) the owner hears about it and cannot show it again. */
  private async hide(type: ReportTargetType, id: string, target: Target, isModerator: boolean) {
    if (type === 'photo') {
      await this.query(
        `UPDATE "work_photos" SET "is_hidden" = true, "is_moderated" = "is_moderated" OR $2
         WHERE "id" = $1`,
        [id, isModerator],
      )
      if (isModerator) await this.tellOwner(target, 'hide')
    }
    if (type === 'review') {
      await this.query('UPDATE "reviews" SET "is_hidden" = true WHERE "id" = $1', [id])
      await this.refreshRating(target.specialistId)
    }
    if (type === 'profile' && target.phone) {
      await this.query(
        `INSERT INTO "moderated_people" ("phone", "hidden_at") VALUES ($1, now())
         ON CONFLICT ("phone") DO UPDATE SET "hidden_at" = COALESCE("moderated_people"."hidden_at", now())`,
        [target.phone],
      )
    }
  }

  private async remove(type: ReportTargetType, id: string, target: Target) {
    if (type === 'photo' && target.businessId) {
      const url = await this.workPhotos.remove(target.businessId, id)
      if (url) await this.storage.remove(url).catch(() => undefined)
      await this.tellOwner(target, 'delete')
    }
    if (type === 'review') {
      await this.query('DELETE FROM "reviews" WHERE "id" = $1', [id])
      await this.refreshRating(target.specialistId)
    }
    // A person stays; what they wrote about themselves goes.
    if (type === 'profile' && target.phone) {
      await this.query(
        `UPDATE "customers" SET "avatar_url" = NULL, "status" = '', "status_emoji" = '', "about" = '',
           "social_links" = '{}', "handle" = NULL, "banner" = NULL
         WHERE "phone" = $1`,
        [target.phone],
      )
    }
  }

  /** The person is out: no sign-in, no sessions, no profile, their reviews hidden. */
  private async block(target: Target) {
    const phone = target.phone
    if (!phone) return
    await this.query(
      `INSERT INTO "moderated_people" ("phone", "hidden_at", "blocked_at") VALUES ($1, now(), now())
       ON CONFLICT ("phone") DO UPDATE SET "blocked_at" = now(),
         "hidden_at" = COALESCE("moderated_people"."hidden_at", now())`,
      [phone],
    )
    await this.query(
      `DELETE FROM "sessions" WHERE "customer_id" IN (SELECT "id" FROM "customers" WHERE "phone" = $1)`,
      [phone],
    )
    const specialists = await this.query(
      `UPDATE "reviews" r SET "is_hidden" = true FROM "bookings" b
       WHERE b."id" = r."booking_id" AND b."customer_phone" = $1 RETURNING r."specialist_id" AS "id"`,
      [phone],
    )
    const ids = new Set(returnedRows(specialists).map((row) => String(row.id)))
    for (const specialistId of ids) await this.refreshRating(specialistId)
  }

  private async tellOwner(target: Target, action: 'hide' | 'delete') {
    if (!target.businessId || !target.preview.business) return
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    await this.telegram.notifyBusiness(
      target.businessId,
      photoModeratedText(
        target.preview.business.name,
        target.preview.text,
        action,
        `${web}/manage/${target.preview.business.slug}?tab=page`,
      ),
    )
  }

  // The master's rating is the mean of the reviews clients can read.
  private async refreshRating(specialistId: string | null) {
    if (!specialistId) return
    await this.query(
      `UPDATE "specialists" SET "rating" = (
         SELECT round(avg("rating")::numeric, 1) FROM "reviews"
         WHERE "specialist_id" = $1 AND NOT "is_hidden"
       ) WHERE "id" = $1`,
      [specialistId],
    )
  }

  private async openReports(type: ReportTargetType, id: string) {
    const [row] = await this.query(
      `SELECT COUNT(*)::int AS "count" FROM "reports"
       WHERE "target_type" = $1 AND "target_id" = $2 AND "resolved_at" IS NULL`,
      [type, id],
    )
    return Number(row?.count ?? 0)
  }

  /** The latest decision about it was 'Keep'. */
  private async isKept(type: ReportTargetType, id: string) {
    const [row] = await this.query(
      `SELECT "action" FROM "moderation_decisions" WHERE "target_type" = $1 AND "target_id" = $2
       ORDER BY "created_at" DESC LIMIT 1`,
      [type, id],
    )
    return row?.action === 'keep'
  }

  private load(type: ReportTargetType, id: string): Promise<Target | null> {
    if (type === 'photo') return this.loadPhoto(id)
    if (type === 'review') return this.loadReview(id)
    return this.loadProfile(id)
  }

  private async loadPhoto(id: string): Promise<Target | null> {
    const [row] = await this.query(
      `SELECT w."url", w."is_hidden" AS "isHidden", w."business_id" AS "businessId",
         w."specialist_id" AS "specialistId", b."slug", b."name" AS "businessName",
         s."name" AS "serviceName", sp."name" AS "specialistName"
       FROM "work_photos" w
       JOIN "businesses" b ON b."id" = w."business_id"
       LEFT JOIN "services" s ON s."id" = w."service_id"
       LEFT JOIN "specialists" sp ON sp."id" = w."specialist_id"
       WHERE w."id" = $1`,
      [id],
    )
    if (!row) return null
    return {
      preview: {
        title:
          [text(row.serviceName), text(row.specialistName)].filter(Boolean).join(' · ') ||
          'Work photo',
        text: text(row.serviceName),
        imageUrl: String(row.url),
        rating: null,
        href: `/feed?start=${id}`,
        business: { slug: String(row.slug), name: String(row.businessName) },
      },
      isHidden: Boolean(row.isHidden),
      businessId: String(row.businessId),
      phone: null,
      specialistId: null,
    }
  }

  private async loadReview(id: string): Promise<Target | null> {
    const [row] = await this.query(
      `SELECT r."rating", r."comment", r."author_name" AS "authorName", r."is_hidden" AS "isHidden",
         r."specialist_id" AS "specialistId", b."slug", b."name" AS "businessName",
         (SELECT rp."url" FROM "review_photos" rp WHERE rp."review_id" = r."id"
           ORDER BY rp."created_at" LIMIT 1) AS "photo"
       FROM "reviews" r JOIN "businesses" b ON b."id" = r."business_id"
       WHERE r."id" = $1`,
      [id],
    )
    if (!row) return null
    return {
      preview: {
        title: String(row.authorName),
        text: text(row.comment) || null,
        imageUrl: text(row.photo),
        rating: Number(row.rating),
        href: `/${String(row.slug)}#reviews`,
        business: { slug: String(row.slug), name: String(row.businessName) },
      },
      isHidden: Boolean(row.isHidden),
      businessId: null,
      phone: null,
      specialistId: text(row.specialistId),
    }
  }

  /** A person by their public id: an account, or a guest known only from reviews. */
  private async loadProfile(id: string): Promise<Target | null> {
    const salt = saltOf(this.config.get('AUTH_SECRET', { infer: true }))
    const [customer] = await this.query(
      `SELECT "phone", "name", "avatar_url" AS "avatarUrl", "status", "status_emoji" AS "statusEmoji",
         "about", "handle" FROM "customers" WHERE ${publicIdSql('"phone"', '$2')} = $1 LIMIT 1`,
      [id, salt],
    )
    const [guest] = customer
      ? [undefined]
      : await this.query(
          `SELECT b."customer_phone" AS "phone", b."customer_name" AS "name"
           FROM "reviews" r JOIN "bookings" b ON b."id" = r."booking_id"
           WHERE ${publicIdSql('b."customer_phone"', '$2')} = $1
           ORDER BY r."created_at" DESC LIMIT 1`,
          [id, salt],
        )
    const person = customer ?? guest
    if (!person) return null
    const phone = String(person.phone)
    const [state] = await this.query(
      'SELECT "hidden_at" AS "hiddenAt", "blocked_at" AS "blockedAt" FROM "moderated_people" WHERE "phone" = $1',
      [phone],
    )
    const status = [text(person.statusEmoji), text(person.status)].filter(Boolean).join(' ')
    const about = text(person.about)
    return {
      preview: {
        title: String(person.name || 'No name'),
        text: [status, about].filter(Boolean).join('\n') || null,
        imageUrl: text(person.avatarUrl),
        rating: null,
        href: `/u/${text(person.handle) ?? id}`,
        business: null,
      },
      isHidden: Boolean(state?.hiddenAt || state?.blockedAt),
      businessId: null,
      phone,
      specialistId: null,
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
