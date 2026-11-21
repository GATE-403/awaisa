import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { toBusinessParts } from '../common/business-time.js'
import { PUBLIC_ID_PATTERN, publicIdOf, publicIdSql, saltOf } from '../common/public-id.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { RankingsService } from '../rankings/rankings.service.js'
import { interestsOf } from '../recommendations/recommend-score.js'
import { ReferralsService } from '../referrals/referrals.service.js'
import { achievementsOf, badgesOf, levelOf } from './profile-badges.js'
import { LINK_LABELS, linksView, normalizeLinks, type ProfileLinks } from './profile-links.js'
import { defaultStyle } from './profile-style.js'
import type { UpdateProfileStyleInput } from './profiles.schemas.js'

type Row = Record<string, unknown>

const DAY_MS = 86_400_000
const EARLY_MINUTES = 10 * 60
const TOP_ITEMS = 6

// Words that read as the service itself, not a person.
const RESERVED_HANDLES = new Set([
  'admin',
  'awaisa',
  'support',
  'help',
  'top',
  'me',
  'api',
  'manage',
])

// Shown publicly as «Айгерим С.», like reviews: a first name and an initial.
const publicName = (name: string) => {
  const [first = '', last = ''] = name.trim().split(/\s+/)
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first || 'Клиент'
}

/**
 * A client's public profile (`/u/<id>`), like a Discord profile: banner, colour and status they
 * chose, a level and badges earned from real visits, their masters and places, their reviews.
 */
@Injectable()
export class ProfilesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
    private readonly rankings: RankingsService,
    private readonly referrals: ReferralsService,
  ) {}

  idOf(phone: string) {
    return publicIdOf(phone, this.secret())
  }

  async settings(customer: Customer) {
    const id = this.idOf(customer.phone)
    const fallback = defaultStyle(id)
    return {
      id,
      banner: customer.banner ?? fallback.banner,
      accent: customer.accent ?? fallback.accent,
      status: customer.status,
      statusEmoji: customer.statusEmoji ?? '',
      handle: customer.handle ?? null,
      about: customer.about ?? '',
      links: customer.socialLinks ?? {},
      featuredBadges: customer.featuredBadges ?? [],
      favoriteMasterId: customer.favoriteMasterId ?? null,
      isPublic: customer.isPublic,
      showPlaces: customer.showPlaces,
    }
  }

  async updateSettings(customer: Customer, input: UpdateProfileStyleInput) {
    const cleaned = input.links ? normalizeLinks(input.links) : null
    if (cleaned && cleaned.invalid.length > 0) {
      throw new BadRequestException(
        `Не получилось прочитать: ${cleaned.invalid.map((kind) => LINK_LABELS[kind]).join(', ')}`,
      )
    }
    if (input.handle) {
      if (RESERVED_HANDLES.has(input.handle)) throw new ConflictException('Этот адрес занят')
      const [taken] = (await this.dataSource.query(
        'SELECT 1 FROM "customers" WHERE lower("handle") = $1 AND "id" <> $2',
        [input.handle, customer.id],
      )) as unknown[]
      if (taken) throw new ConflictException('Этот адрес занят')
    }
    await this.dataSource.query(
      `UPDATE "customers" SET
         "banner" = CASE WHEN $2 THEN $3 ELSE "banner" END,
         "accent" = CASE WHEN $4 THEN $5 ELSE "accent" END,
         "status" = COALESCE($6, "status"),
         "is_public" = COALESCE($7, "is_public"),
         "show_places" = COALESCE($8, "show_places"),
         "status_emoji" = COALESCE($9, "status_emoji"),
         "about" = COALESCE($10, "about"),
         "featured_badges" = CASE WHEN $11 THEN $12::text[] ELSE "featured_badges" END,
         "favorite_master_id" = CASE WHEN $13 THEN $14 ELSE "favorite_master_id" END,
         "handle" = CASE WHEN $15 THEN $16 ELSE "handle" END,
         "social_links" = CASE WHEN $17 THEN $18::jsonb ELSE "social_links" END
       WHERE "id" = $1`,
      [
        customer.id,
        input.banner !== undefined,
        input.banner ?? null,
        input.accent !== undefined,
        input.accent ?? null,
        input.status ?? null,
        input.isPublic ?? null,
        input.showPlaces ?? null,
        input.statusEmoji ?? null,
        input.about ?? null,
        input.featuredBadges !== undefined,
        input.featuredBadges ?? [],
        input.favoriteMasterId !== undefined,
        input.favoriteMasterId ?? null,
        input.handle !== undefined,
        input.handle ?? null,
        cleaned !== null,
        JSON.stringify(cleaned?.links ?? {}),
      ],
    )
    const [updated] = (await this.dataSource.query('SELECT * FROM "customers" WHERE "id" = $1', [
      customer.id,
    ])) as Row[]
    return this.settings({
      ...customer,
      banner: (updated?.banner as string | null) ?? null,
      accent: (updated?.accent as string | null) ?? null,
      status: String(updated?.status ?? ''),
      statusEmoji: String(updated?.status_emoji ?? ''),
      handle: (updated?.handle as string | null) ?? null,
      about: String(updated?.about ?? ''),
      socialLinks: (updated?.social_links as ProfileLinks | null) ?? {},
      featuredBadges: (updated?.featured_badges as string[] | null) ?? [],
      favoriteMasterId: (updated?.favorite_master_id as string | null) ?? null,
      isPublic: Boolean(updated?.is_public),
      showPlaces: Boolean(updated?.show_places),
    })
  }

  async profile(idOrHandle: string, viewer: Customer | null) {
    const person = await this.findPerson(idOrHandle)
    const id = this.idOf(person.phone)
    const isOwn = viewer?.phone === person.phone
    if (!person.isPublic && !isOwn) throw new NotFoundException('Профиль скрыт')

    // Only the owner sees how many recent visits still wait for their stars.
    const awaitingReview = isOwn ? await this.awaitingReview(person.phone) : 0
    const [visits, reviews, clientRanks, masterRanks, friends] = await Promise.all([
      this.query(
        `SELECT b."starts_at" AS "startsAt", s."name" AS "serviceName",
           bz."slug", bz."name" AS "businessName", bz."logo_url" AS "logoUrl", bz."cover_url" AS "coverUrl",
           sp."id" AS "masterId", sp."name" AS "masterName", sp."photo_url" AS "masterPhoto", sp."role" AS "masterRole"
         FROM "bookings" b
         JOIN "services" s ON s."id" = b."service_id"
         JOIN "businesses" bz ON bz."id" = b."business_id" AND bz."is_published"
         LEFT JOIN "specialists" sp ON sp."id" = b."specialist_id" AND sp."is_active"
         WHERE b."customer_phone" = $1 AND b."status" = 'confirmed' AND b."starts_at" < now()
           AND b."outcome" IS DISTINCT FROM 'no_show'
         ORDER BY b."starts_at" DESC`,
        [person.phone],
      ),
      this.query(
        `SELECT r."id", r."rating", r."comment", r."reply", r."created_at" AS "createdAt",
           s."name" AS "serviceName", sp."name" AS "specialistName",
           bz."slug", bz."name" AS "businessName", bz."logo_url" AS "logoUrl", bz."cover_url" AS "coverUrl",
           COALESCE((SELECT array_agg(rp."url" ORDER BY rp."created_at") FROM "review_photos" rp
             WHERE rp."review_id" = r."id"), '{}') AS "photos"
         FROM "reviews" r
         JOIN "bookings" b ON b."id" = r."booking_id"
         JOIN "businesses" bz ON bz."id" = r."business_id" AND bz."is_published"
         LEFT JOIN "services" s ON s."id" = r."service_id"
         LEFT JOIN "specialists" sp ON sp."id" = r."specialist_id"
         WHERE b."customer_phone" = $1 AND r."anonymized_at" IS NULL
         ORDER BY r."created_at" DESC LIMIT 30`,
        [person.phone],
      ),
      this.rankings.clientRanks(),
      this.rankings.masterRanks(),
      this.referrals.friendsOf(person.phone),
    ])

    const places = new Map<
      string,
      {
        slug: string
        name: string
        logoUrl: string | null
        coverUrl: string | null
        visits: number
      }
    >()
    const masters = new Map<
      string,
      {
        id: string
        name: string
        photoUrl: string | null
        role: string
        slug: string
        businessName: string
        visits: number
      }
    >()
    const kinds = new Set<string>()
    let early = 0
    for (const visit of visits) {
      const slug = String(visit.slug)
      const place = places.get(slug) ?? {
        slug,
        name: String(visit.businessName),
        logoUrl: (visit.logoUrl as string | null) ?? null,
        coverUrl: (visit.coverUrl as string | null) ?? null,
        visits: 0,
      }
      place.visits += 1
      places.set(slug, place)
      if (visit.masterId) {
        const key = String(visit.masterId)
        const master = masters.get(key) ?? {
          id: key,
          name: String(visit.masterName),
          photoUrl: (visit.masterPhoto as string | null) ?? null,
          role: String(visit.masterRole ?? ''),
          slug,
          businessName: String(visit.businessName),
          visits: 0,
        }
        master.visits += 1
        masters.set(key, master)
      }
      for (const kind of interestsOf(String(visit.serviceName))) kinds.add(kind)
      if (toBusinessParts(new Date(visit.startsAt as string)).minutes < EARLY_MINUTES) early += 1
    }
    const byVisits = <T extends { visits: number }>(items: Iterable<T>) =>
      [...items].sort((first, second) => second.visits - first.visits)
    const topPlaces = byVisits(places.values())
    const firstVisit = visits.at(-1)?.startsAt
    const stats = {
      visits: visits.length,
      reviews: reviews.length,
      kinds: kinds.size,
      places: places.size,
      topPlace: topPlaces[0] ? { name: topPlaces[0].name, visits: topPlaces[0].visits } : null,
      earlyVisits: early,
      friends,
      firstVisitDaysAgo: firstVisit
        ? Math.floor((Date.now() - new Date(firstVisit as string).getTime()) / DAY_MS)
        : null,
    }
    const style = defaultStyle(id)
    const average = reviews.length
      ? Math.round(
          (reviews.reduce((sum, row) => sum + Number(row.rating), 0) / reviews.length) * 10,
        ) / 10
      : null
    const showsPlaces = person.showPlaces || isOwn

    return {
      id,
      name: publicName(person.name),
      avatarUrl: person.avatarUrl,
      banner: person.banner ?? style.banner,
      accent: person.accent ?? style.accent,
      status: person.status,
      statusEmoji: person.statusEmoji,
      handle: person.handle,
      friends,
      about: person.about,
      links: linksView(person.socialLinks),
      // The showcase: the achievements the client chose to show by the name (earned ones only).
      featured: person.featuredBadges
        .map((badgeId) => achievementsOf(stats).find((item) => item.id === badgeId && item.earned))
        .filter((item) => item !== undefined),
      favoriteMaster: (() => {
        const master = person.favoriteMasterId ? masters.get(person.favoriteMasterId) : undefined
        return master && showsPlaces
          ? { ...master, rank: masterRanks.get(master.id) ?? null }
          : null
      })(),
      isOwn,
      awaitingReview,
      isPublic: person.isPublic,
      since: (
        person.createdAt ?? (firstVisit ? new Date(firstVisit as string) : new Date())
      ).toISOString(),
      level: levelOf(stats),
      rank: clientRanks.get(person.phone) ?? null,
      badges: badgesOf(stats),
      achievements: achievementsOf(stats),
      stats: {
        visits: stats.visits,
        places: stats.places,
        reviews: stats.reviews,
        average,
        friends,
      },
      places: showsPlaces ? topPlaces.slice(0, TOP_ITEMS) : [],
      masters: showsPlaces
        ? byVisits(masters.values())
            .slice(0, TOP_ITEMS)
            .map((master) => ({ ...master, rank: masterRanks.get(master.id) ?? null }))
        : [],
      reviews: reviews.map((row) => ({
        id: String(row.id),
        rating: Number(row.rating),
        comment: String(row.comment ?? ''),
        reply: (row.reply as string | null) ?? null,
        createdAt: new Date(row.createdAt as string).toISOString(),
        serviceName: String(row.serviceName ?? ''),
        specialistName: String(row.specialistName ?? ''),
        photos: (row.photos as string[] | null) ?? [],
        business: {
          slug: String(row.slug),
          name: String(row.businessName),
          logoUrl: (row.logoUrl as string | null) ?? null,
          coverUrl: (row.coverUrl as string | null) ?? null,
        },
      })),
    }
  }

  /** Ended visits of the last two weeks without a review — the «Как прошло?» card asks the same. */
  private async awaitingReview(phone: string) {
    const [row] = await this.query(
      `SELECT COUNT(*)::int AS "count" FROM "bookings" b
       WHERE b."customer_phone" = $1 AND b."status" = 'confirmed'
         AND b."ends_at" <= now() AND b."ends_at" > now() - interval '14 days'
         AND b."outcome" IS DISTINCT FROM 'no_show'
         AND NOT EXISTS (SELECT 1 FROM "reviews" r WHERE r."booking_id" = b."id")`,
      [phone],
    )
    return Number(row?.count ?? 0)
  }

  /** The account with this public id, or — for guests who only left reviews — their phone. */
  private async findPerson(id: string) {
    const salt = saltOf(this.secret())
    const isPublicId = PUBLIC_ID_PATTERN.test(id)
    const [customer] = isPublicId
      ? await this.query(
          `SELECT * FROM "customers" WHERE ${publicIdSql('"phone"', '$2')} = $1 LIMIT 1`,
          [id, salt],
        )
      : await this.query('SELECT * FROM "customers" WHERE lower("handle") = $1 LIMIT 1', [
          id.toLowerCase(),
        ])
    if (customer) {
      return {
        phone: String(customer.phone),
        name: String(customer.name ?? ''),
        avatarUrl: (customer.avatar_url as string | null) ?? null,
        banner: (customer.banner as string | null) ?? null,
        accent: (customer.accent as string | null) ?? null,
        status: String(customer.status ?? ''),
        statusEmoji: String(customer.status_emoji ?? ''),
        handle: (customer.handle as string | null) ?? null,
        about: String(customer.about ?? ''),
        socialLinks: (customer.social_links as ProfileLinks | null) ?? {},
        featuredBadges: (customer.featured_badges as string[] | null) ?? [],
        favoriteMasterId: (customer.favorite_master_id as string | null) ?? null,
        isPublic: Boolean(customer.is_public),
        showPlaces: Boolean(customer.show_places),
        createdAt: new Date(customer.created_at as string),
      }
    }
    if (!isPublicId) throw new NotFoundException('Профиль не найден')
    const [guest] = await this.query(
      `SELECT b."customer_phone" AS "phone", b."customer_name" AS "name"
       FROM "reviews" r JOIN "bookings" b ON b."id" = r."booking_id"
       WHERE ${publicIdSql('b."customer_phone"', '$2')} = $1 AND r."anonymized_at" IS NULL
       ORDER BY r."created_at" DESC LIMIT 1`,
      [id, salt],
    )
    if (!guest) throw new NotFoundException('Профиль не найден')
    return {
      phone: String(guest.phone),
      name: String(guest.name ?? ''),
      avatarUrl: null,
      banner: null,
      accent: null,
      status: '',
      statusEmoji: '',
      handle: null as string | null,
      about: '',
      socialLinks: {} as ProfileLinks,
      featuredBadges: [] as string[],
      favoriteMasterId: null as string | null,
      isPublic: true,
      showPlaces: true,
      createdAt: null as Date | null,
    }
  }

  private secret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }

  private query(sql: string, params: unknown[] = []) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
