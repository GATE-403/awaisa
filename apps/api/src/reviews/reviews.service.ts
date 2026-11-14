import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import type { Booking } from '../bookings/booking.entity.js'
import { BookingsService } from '../bookings/bookings.service.js'
import type { Business } from '../businesses/business.entity.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { saltOf } from '../common/public-id.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { processImage } from '../media/images.js'
import { StorageService } from '../media/storage.service.js'
import { WorkPhotosService } from '../media/work-photos.service.js'
import { reviewRequestMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import { RankingsService } from '../rankings/rankings.service.js'
import { TelegramBotService } from '../telegram/telegram-bot.service.js'
import { reviewText } from '../telegram/telegram-messages.js'
import { Review } from './review.entity.js'
import type { CreateReviewInput } from './reviews.schemas.js'

type Access = { token: string | null; signature: string | null; customer: Customer | null }

type ReviewRow = {
  id: string
  rating: number
  comment: string
  authorName: string
  reply: string | null
  repliedAt: Date | null
  createdAt: Date
  specialistName: string
  serviceName: string
  serviceId?: string
  authorAvatarUrl?: string | null
  visitDate?: Date
  customerPhone?: string
  photos?: string[] | null
}

type ReviewerRow = ReviewRow & {
  slug: string
  businessName: string
  coverUrl: string | null
}

// The «how was it?» SMS goes out two hours after the visit, and not later than a day after.
const REQUEST_AFTER_HOURS = 2
const REQUEST_WITHIN_HOURS = 24
const SIGNATURE_LENGTH = 22
const MAX_REVIEW_PHOTOS = 3

// Shown publicly as «Айгерим С.»: a first name and an initial, never the full name.
const toAuthorName = (name: string) => {
  const [first = '', last = ''] = name.trim().split(/\s+/)
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first || 'Клиент'
}

const toView = (row: ReviewRow, authorId: string | null = null) => ({
  id: row.id,
  authorId,
  authorAvatarUrl: row.authorAvatarUrl ?? null,
  serviceId: row.serviceId ?? null,
  rating: Number(row.rating),
  comment: row.comment,
  authorName: row.authorName,
  reply: row.reply,
  repliedAt: row.repliedAt ? new Date(row.repliedAt).toISOString() : null,
  createdAt: new Date(row.createdAt).toISOString(),
  specialistName: row.specialistName,
  serviceName: row.serviceName,
  photos: row.photos ?? [],
})

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name)

  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bookings: BookingsService,
    private readonly businesses: BusinessesService,
    private readonly sms: SmsService,
    private readonly telegram: TelegramBotService,
    private readonly config: ConfigService<Env, true>,
    private readonly rankings: RankingsService,
    private readonly storage: StorageService,
    private readonly workPhotos: WorkPhotosService,
  ) {}

  /** The prefix of a reviewer's public key: secret, so the key never gives the phone away. */
  private reviewerSalt() {
    return saltOf(this.config.get('AUTH_SECRET', { infer: true }))
  }

  /** A stable public id for whoever wrote a review: one per phone, not reversible. */
  reviewerId(phone: string) {
    return createHash('sha256')
      .update(this.reviewerSalt() + phone)
      .digest('hex')
      .slice(0, 20)
  }

  /** A reviewer's public page: their «Имя Ф.», face and reviews of published places. */
  async reviewer(id: string) {
    const rows = (await this.dataSource.query(
      `SELECT r."id", r."rating", r."comment", r."author_name" AS "authorName", r."reply",
         r."replied_at" AS "repliedAt", r."created_at" AS "createdAt",
         sp."name" AS "specialistName", s."name" AS "serviceName", r."service_id" AS "serviceId",
         c."avatar_url" AS "authorAvatarUrl",
         COALESCE((SELECT array_agg(rp."url" ORDER BY rp."created_at") FROM "review_photos" rp
           WHERE rp."review_id" = r."id"), '{}') AS "photos",
         bz."slug", bz."name" AS "businessName", bz."cover_url" AS "coverUrl"
       FROM "reviews" r
       JOIN "bookings" b ON b."id" = r."booking_id"
       JOIN "businesses" bz ON bz."id" = r."business_id" AND bz."is_published"
       LEFT JOIN "customers" c ON c."phone" = b."customer_phone"
       LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
       LEFT JOIN "services" s ON s."id" = r."service_id"
       WHERE left(encode(sha256(convert_to($2 || b."customer_phone", 'UTF8')), 'hex'), 20) = $1
       ORDER BY r."created_at" DESC LIMIT 50`,
      [id, this.reviewerSalt()],
    )) as ReviewerRow[]
    const [latest] = rows
    if (!latest) throw new NotFoundException('Профиль не найден')
    const total = rows.reduce((sum, row) => sum + Number(row.rating), 0)

    return {
      id,
      name: latest.authorName,
      avatarUrl: rows.find((row) => row.authorAvatarUrl)?.authorAvatarUrl ?? null,
      count: rows.length,
      average: Math.round((total / rows.length) * 10) / 10,
      places: new Set(rows.map((row) => row.slug)).size,
      since: new Date(rows[rows.length - 1]?.createdAt ?? latest.createdAt).toISOString(),
      items: rows.map((row) => ({
        ...toView(row, id),
        business: { slug: row.slug, name: row.businessName, coverUrl: row.coverUrl },
      })),
    }
  }

  /** A link that opens the review form for one visit without signing in (sent by SMS). */
  signature(bookingId: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(`review:${bookingId}`)
      .digest('base64url')
      .slice(0, SIGNATURE_LENGTH)
  }

  async getForClient(bookingId: string, access: Access) {
    const booking = await this.authorize(bookingId, access)
    const view = await this.bookings.getView(booking.id)

    return { visit: view, canReview: this.canReview(booking) && view.review === null }
  }

  async create(bookingId: string, access: Access, input: CreateReviewInput) {
    const booking = await this.authorize(bookingId, access)
    if (!this.canReview(booking)) {
      throw new ForbiddenException('Оценить можно после визита')
    }
    if (await this.reviews.existsBy({ bookingId })) {
      throw new ConflictException('Вы уже оценили этот визит')
    }

    const review = await this.reviews.save(
      this.reviews.create({
        businessId: booking.businessId,
        bookingId,
        specialistId: booking.specialistId,
        serviceId: booking.serviceId,
        rating: input.rating,
        comment: input.comment,
        authorName: toAuthorName(booking.customerName),
      }),
    )
    // The master's rating is the mean of real reviews from the first one on.
    await this.dataSource.query(
      `UPDATE "specialists" SET "rating" = (
         SELECT round(avg("rating")::numeric, 1) FROM "reviews" WHERE "specialist_id" = $1
       ) WHERE "id" = $1`,
      [booking.specialistId],
    )
    const view = await this.bookings.getView(bookingId)
    void this.telegram.notifyBusiness(
      booking.businessId,
      reviewText(view.business.name, { ...review, specialistName: view.specialistName }),
    )

    return {
      ...toView({ ...review, specialistName: view.specialistName, serviceName: view.serviceName }),
      slug: view.business.slug,
    }
  }

  /**
   * A picture for the visit's review (three at most). It also goes to the place's «Работы»,
   * tagged with the visit's service and master, while there is room there.
   */
  async addPhoto(bookingId: string, access: Access, file: Buffer) {
    const booking = await this.authorize(bookingId, access)
    const review = await this.reviews.findOneBy({ bookingId })
    if (!review) throw new NotFoundException('Сначала оцените визит')
    const [count] = (await this.dataSource.query(
      'SELECT COUNT(*)::int AS "count" FROM "review_photos" WHERE "review_id" = $1',
      [review.id],
    )) as { count: number }[]
    if ((count?.count ?? 0) >= MAX_REVIEW_PHOTOS) {
      throw new BadRequestException(`Можно до ${MAX_REVIEW_PHOTOS} фото`)
    }
    const url = await this.storage.put(
      `${booking.businessId}/${randomUUID()}.webp`,
      await processImage(file, 'photo'),
    )
    await this.dataSource.query(
      'INSERT INTO "review_photos" ("review_id", "url") VALUES ($1, $2)',
      [review.id, url],
    )
    if (await this.workPhotos.hasRoom(booking.businessId)) {
      await this.workPhotos.add(booking.businessId, url, {
        serviceId: booking.serviceId,
        specialistId: booking.specialistId,
        bookingId,
      })
    }
    const rows = (await this.dataSource.query(
      'SELECT "url" FROM "review_photos" WHERE "review_id" = $1 ORDER BY "created_at"',
      [review.id],
    )) as { url: string }[]

    return { photos: rows.map((row) => row.url) }
  }

  async listPublic(slug: string, limit: number, serviceId?: string) {
    const business = await this.businesses.findBySlug(slug)
    return this.summary(business, limit, false, serviceId)
  }

  async listForManage(business: Business) {
    return this.summary(business, 100, true)
  }

  async reply(business: Business, id: string, text: string) {
    const review = await this.reviews.findOneBy({ id, businessId: business.id })
    if (!review) throw new NotFoundException('Отзыв не найден')
    await this.reviews.update({ id }, { reply: text || null, repliedAt: text ? new Date() : null })

    return { id, reply: text || null }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendReviewRequests() {
    // Claimed with UPDATE … RETURNING so several API instances never text twice.
    const result: unknown = await this.dataSource.query(
      `UPDATE "bookings" AS b SET "review_requested_at" = now()
       FROM "businesses" AS bz
       WHERE bz."id" = b."business_id" AND b."status" = 'confirmed'
         AND b."review_requested_at" IS NULL AND b."sms_confirmation"
         AND b."ends_at" <= now() - make_interval(hours => $1)
         AND b."ends_at" > now() - make_interval(hours => $2)
         AND NOT EXISTS (SELECT 1 FROM "reviews" r WHERE r."booking_id" = b."id")
       RETURNING b."id", b."customer_phone" AS "phone", bz."name" AS "businessName"`,
      [REQUEST_AFTER_HOURS, REQUEST_WITHIN_HOURS],
    )
    const due = (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as {
      id: string
      phone: string
      businessName: string
    }[]
    if (due.length === 0) return

    this.logger.log(`Asking ${due.length} client(s) for a review`)
    const webUrl = this.config.get('PUBLIC_WEB_URL', { infer: true })
    await Promise.all(
      due.map((row) =>
        this.sms.sendSafely(
          row.phone,
          reviewRequestMessage(
            row.businessName,
            `${webUrl}/review/${row.id}?s=${this.signature(row.id)}`,
          ),
        ),
      ),
    )
  }

  private async summary(business: Business, limit: number, isManage = false, serviceId?: string) {
    const clientRanks = await this.rankings.clientRanks()
    const params = serviceId ? [business.id, serviceId] : [business.id]
    const byService = serviceId ? ` AND "service_id" = $2` : ''
    const [totals] = (await this.dataSource.query(
      `SELECT COUNT(*)::int AS "count", COALESCE(round(avg("rating")::numeric, 1), 0)::float AS "average",
         COUNT(*) FILTER (WHERE "rating" = 5)::int AS "r5", COUNT(*) FILTER (WHERE "rating" = 4)::int AS "r4",
         COUNT(*) FILTER (WHERE "rating" = 3)::int AS "r3", COUNT(*) FILTER (WHERE "rating" = 2)::int AS "r2",
         COUNT(*) FILTER (WHERE "rating" = 1)::int AS "r1"
       FROM "reviews" WHERE "business_id" = $1${byService}`,
      params,
    )) as Record<string, number>[]
    const rows = (await this.dataSource.query(
      `SELECT r."id", r."rating", r."comment", r."author_name" AS "authorName", r."reply",
         r."replied_at" AS "repliedAt", r."created_at" AS "createdAt",
         sp."name" AS "specialistName", s."name" AS "serviceName", r."service_id" AS "serviceId",
         b."starts_at" AS "visitDate", b."customer_phone" AS "customerPhone",
         c."avatar_url" AS "authorAvatarUrl",
         COALESCE((SELECT array_agg(rp."url" ORDER BY rp."created_at") FROM "review_photos" rp
           WHERE rp."review_id" = r."id"), '{}') AS "photos"
       FROM "reviews" r
       JOIN "bookings" b ON b."id" = r."booking_id"
       LEFT JOIN "customers" c ON c."phone" = b."customer_phone"
       LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
       LEFT JOIN "services" s ON s."id" = r."service_id"
       WHERE r."business_id" = $1${serviceId ? ' AND r."service_id" = $3' : ''}
       ORDER BY r."created_at" DESC LIMIT $2`,
      serviceId ? [business.id, limit, serviceId] : [business.id, limit],
    )) as ReviewRow[]

    return {
      count: totals?.count ?? 0,
      average: totals?.average ?? 0,
      distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: totals?.[`r${stars}`] ?? 0 })),
      items: rows.map((row) => ({
        ...toView(row, row.customerPhone ? this.reviewerId(row.customerPhone) : null),
        // The platform's three most active clients wear a laurel wreath on their face.
        authorRank: (row.customerPhone && clientRanks.get(row.customerPhone)) || null,
        ...(isManage
          ? {
              customerPhone: row.customerPhone ?? '',
              visitDate: row.visitDate ? new Date(row.visitDate).toISOString() : null,
            }
          : {}),
      })),
    }
  }

  private canReview(booking: Booking) {
    return booking.status === 'confirmed' && booking.endsAt.getTime() <= Date.now()
  }

  private async authorize(bookingId: string, { token, signature, customer }: Access) {
    const booking = this.isSigned(bookingId, signature)
      ? await this.bookings.findById(bookingId)
      : await this.bookings.findAccessible(bookingId, token, customer)
    if (!booking) throw new NotFoundException('Запись не найдена')

    return booking
  }

  private isSigned(bookingId: string, signature: string | null) {
    if (!signature || signature.length !== SIGNATURE_LENGTH) return false
    const expected = Buffer.from(this.signature(bookingId))
    const actual = Buffer.from(signature)

    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
}
