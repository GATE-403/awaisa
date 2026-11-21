import type { BulkReplyResult, ReviewReplySettings } from '@awaisa/contracts'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { CacheService } from '../cache/cache.service.js'
import {
  DEFAULT_AUTO_TEMPLATE,
  DEFAULT_QUICK_REPLIES,
  fillReplyTemplate,
} from './review-reply-text.js'
import type { BulkReplyInput, ReplySettingsInput } from './reviews.schemas.js'

// The automatic reply waits a little: an answer in the same minute reads as a robot.
const AUTO_REPLY_AFTER_HOURS = 1
// One run answers at most this many; the rest go on the next run, ten minutes later.
const AUTO_REPLY_BATCH = 200

type SettingsRow = {
  autoEnabled: boolean
  autoMinRating: number
  autoTemplate: string
  quickReplies: string[]
}

type DueRow = {
  id: string
  authorName: string
  specialistName: string | null
  serviceName: string | null
  template: string
}

/**
 * So a business does not answer every review by hand: its reply settings (an automatic reply to
 * good reviews, quick replies for the rest) and the job that sends the automatic replies.
 */
@Injectable()
export class ReviewRepliesService {
  private readonly logger = new Logger(ReviewRepliesService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  async getSettings(business: Pick<Business, 'id'>): Promise<ReviewReplySettings> {
    const [row] = (await this.dataSource.query(
      `SELECT "auto_enabled" AS "autoEnabled", "auto_min_rating" AS "autoMinRating",
         "auto_template" AS "autoTemplate", "quick_replies" AS "quickReplies"
       FROM "review_reply_settings" WHERE "business_id" = $1`,
      [business.id],
    )) as SettingsRow[]

    return {
      autoReply: {
        isEnabled: row?.autoEnabled ?? false,
        minRating: row?.autoMinRating === 4 ? 4 : 5,
        template: row?.autoTemplate || DEFAULT_AUTO_TEMPLATE,
      },
      quickReplies: row ? row.quickReplies : DEFAULT_QUICK_REPLIES,
    }
  }

  /**
   * Switching the automatic reply on starts it from now: reviews already waiting are not answered
   * in one sweep (the owner may want to answer some of them in person).
   */
  async saveSettings(business: Business, input: ReplySettingsInput): Promise<ReviewReplySettings> {
    await this.dataSource.query(
      `INSERT INTO "review_reply_settings" AS s ("business_id", "auto_enabled", "auto_min_rating",
         "auto_template", "quick_replies", "auto_since")
       VALUES ($1, $2, $3, $4, $5::jsonb, CASE WHEN $2 THEN now() END)
       ON CONFLICT ("business_id") DO UPDATE SET
         "auto_enabled" = EXCLUDED."auto_enabled",
         "auto_min_rating" = EXCLUDED."auto_min_rating",
         "auto_template" = EXCLUDED."auto_template",
         "quick_replies" = EXCLUDED."quick_replies",
         "auto_since" = CASE WHEN EXCLUDED."auto_enabled" THEN COALESCE(s."auto_since", now()) END,
         "updated_at" = now()`,
      [
        business.id,
        input.autoReply.isEnabled,
        input.autoReply.minRating,
        input.autoReply.template,
        JSON.stringify(input.quickReplies),
      ],
    )

    return this.getSettings(business)
  }

  /**
   * Answers every unanswered review without words from `minRating` up with one template, filled
   * per review (the backlog the automatic reply leaves alone). Marked as template replies.
   */
  async bulkReply(business: Business, input: BulkReplyInput): Promise<BulkReplyResult> {
    const due = (await this.dataSource.query(
      `SELECT r."id", r."author_name" AS "authorName", sp."name" AS "specialistName",
         s."name" AS "serviceName", $3::text AS "template"
       FROM "reviews" r
       LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
       LEFT JOIN "services" s ON s."id" = r."service_id"
       WHERE r."business_id" = $1 AND r."reply" IS NULL AND r."comment" = ''
         AND r."rating" >= $2`,
      [business.id, input.minRating, input.template],
    )) as DueRow[]
    const count = await this.answer(due)
    if (count > 0) await this.cache.bump(['catalog'])

    return { count }
  }

  /** Good reviews an hour old, still without a reply, get the place's automatic one. */
  /**
   * Fills each review's template and saves it as a template reply. Claimed by `reply IS NULL`: an
   * owner who answered meanwhile, or another instance, wins. Returns how many were answered.
   */
  private async answer(due: DueRow[]) {
    let sent = 0
    for (const row of due) {
      const text = fillReplyTemplate(row.template || DEFAULT_AUTO_TEMPLATE, {
        authorName: row.authorName,
        specialistName: row.specialistName ?? '',
        serviceName: row.serviceName ?? '',
      })
      const result: unknown = await this.dataSource.query(
        `UPDATE "reviews" SET "reply" = $1, "replied_at" = now(), "is_auto_reply" = true
         WHERE "id" = $2 AND "reply" IS NULL RETURNING "id"`,
        [text, row.id],
      )
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
      if (Array.isArray(rows) && rows.length > 0) sent += 1
    }

    return sent
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendAutoReplies() {
    const due = (await this.dataSource.query(
      `SELECT r."id", r."author_name" AS "authorName", sp."name" AS "specialistName",
         s."name" AS "serviceName", st."auto_template" AS "template"
       FROM "reviews" r
       JOIN "review_reply_settings" st ON st."business_id" = r."business_id" AND st."auto_enabled"
       LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
       LEFT JOIN "services" s ON s."id" = r."service_id"
       WHERE r."reply" IS NULL AND r."rating" >= st."auto_min_rating"
         AND r."created_at" >= st."auto_since"
         AND r."created_at" <= now() - make_interval(hours => $1)
       ORDER BY r."created_at"
       LIMIT $2`,
      [AUTO_REPLY_AFTER_HOURS, AUTO_REPLY_BATCH],
    )) as DueRow[]
    if (due.length === 0) return

    const sent = await this.answer(due)
    if (sent === 0) return

    this.logger.log(`Auto-replied to ${sent} review(s)`)
    // The public pages show replies; a job's writes do not pass the cache interceptor.
    await this.cache.bump(['catalog'])
  }
}
