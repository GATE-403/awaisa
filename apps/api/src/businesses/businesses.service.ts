import { randomUUID } from 'node:crypto'
import type { BusinessLink, MapPlace, Offer } from '@awaisa/contracts'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { BillingService } from '../billing/billing.service.js'
import { Category } from '../catalog/category.entity.js'
import { Service } from '../catalog/service.entity.js'
import {
  addDays,
  businessDateTimeToUtc,
  formatMinutes,
  toBusinessParts,
  weekdayOf,
} from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { Customer } from '../customers/customer.entity.js'
import { SearchService } from '../search/search.service.js'
import { Branch, type BranchView, toBranchView } from './branch.entity.js'
import { Business } from './business.entity.js'
import { BusinessMember } from './business-member.entity.js'
import { DEFAULT_HOURS, getSlugProblem } from './business-rules.js'
import type {
  BranchInput,
  CatalogQuery,
  CreateBusinessInput,
  HoursInput,
  MapQuery,
  UpdateBusinessInput,
} from './businesses.schemas.js'
import { type PlaceSignals, rankSimilarPlaces } from './similar-places.js'
import { WorkingHours } from './working-hours.entity.js'

type BusinessView = {
  id: string
  slug: string
  name: string
  kind: Business['kind']
  description: string
  city: string
  address: string
  phone: string
  whatsapp: string
  mapUrl: string
  slotMinutes: number
  isPublished: boolean
  coverUrl: string | null
  logoUrl: string | null
  hours: { weekday: number; opensMinutes: number; closesMinutes: number }[]
}

type BusinessCard = Pick<
  BusinessView,
  'slug' | 'name' | 'kind' | 'description' | 'city' | 'address'
> & {
  servicesCount: number
  minPrice: number
  coverUrl: string | null
  logoUrl: string | null
  /** The average of real reviews; null until the first one. */
  rating: number | null
  reviewsCount: number
  hours: { weekday: number; opensMinutes: number; closesMinutes: number }[]
  /** Up to three visible work photos after the cover: the place card leafs through them. */
  photos: string[]
}

const MAX_CATALOG_ITEMS = 60
const SIMILAR_PLACES = 10

const MAX_MAP_ITEMS = 200

const MAX_POPULAR_SERVICES = 12

const MAX_OFFERS = 60
// A price is compared only with at least this many other places offering the same service.
const MIN_PRICE_PEERS = 4

const toBusinessView = (business: Business): BusinessView => ({
  id: business.id,
  slug: business.slug,
  name: business.name,
  kind: business.kind,
  description: business.description,
  city: business.city,
  address: business.address,
  phone: business.phone,
  whatsapp: business.whatsapp,
  mapUrl: business.mapUrl,
  slotMinutes: business.slotMinutes,
  isPublished: business.isPublished,
  coverUrl: business.coverUrl,
  logoUrl: business.logoUrl,
  hours: (business.hours ?? [])
    .map(({ weekday, opensMinutes, closesMinutes }) => ({ weekday, opensMinutes, closesMinutes }))
    .sort((first, second) => first.weekday - second.weekday),
})

const normalizeOptionalPhone = (value: string | undefined) => {
  if (value === undefined || value === '') return value
  const phone = normalizePhone(value)
  if (!phone) throw new BadRequestException('Enter a valid phone number')

  return phone
}

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business) private readonly businesses: Repository<Business>,
    @InjectRepository(BusinessMember) private readonly members: Repository<BusinessMember>,
    @InjectRepository(WorkingHours) private readonly hours: Repository<WorkingHours>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly search: SearchService,
    private readonly billing: BillingService,
  ) {}

  async listCatalog({
    kind,
    q,
    offset = 0,
    limit = MAX_CATALOG_ITEMS,
  }: CatalogQuery): Promise<BusinessCard[]> {
    const rows = (await this.dataSource.query(
      `
      SELECT b."slug", b."name", b."kind", b."description", b."city", b."address",
        b."cover_url" AS "coverUrl", b."logo_url" AS "logoUrl",
        COUNT(s."id")::int AS "servicesCount", MIN(s."price")::int AS "minPrice",
        (SELECT ROUND(AVG(r."rating")::numeric, 1)::float8 FROM "reviews" r
          WHERE r."business_id" = b."id") AS "rating",
        (SELECT COUNT(*)::int FROM "reviews" r WHERE r."business_id" = b."id") AS "reviewsCount",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'weekday', h."weekday", 'opensMinutes', h."opens_minutes", 'closesMinutes', h."closes_minutes"
          ) ORDER BY h."weekday"), '[]')
          FROM "working_hours" h WHERE h."business_id" = b."id"
        ) AS "hours",
        -- The same order as the place's own 'Works': the owner's first, then the newest.
        ARRAY(
          SELECT w."url" FROM "work_photos" w
          WHERE w."business_id" = b."id" AND NOT w."is_hidden"
          ORDER BY w."position" ASC NULLS FIRST, w."created_at" DESC LIMIT 3
        ) AS "photos"
      FROM "businesses" b
      JOIN "services" s ON s."business_id" = b."id" AND s."is_active"
      WHERE b."is_published"
        AND ($1::text IS NULL OR b."kind" = $1)
        AND ($2::text[] IS NULL OR b."name" ILIKE ANY($2::text[]) OR b."address" ILIKE ANY($2::text[])
          OR b."description" ILIKE ANY($2::text[])
          OR EXISTS (
            SELECT 1 FROM "services" sq
            WHERE sq."business_id" = b."id" AND sq."is_active" AND sq."name" ILIKE ANY($2::text[])
          ))
      GROUP BY b."id"
      ORDER BY b."created_at" ASC, b."id" ASC
      LIMIT $3 OFFSET $4
      `,
      [
        kind ?? null,
        q ? ((await this.search.resolve(q))?.patterns ?? null) : null,
        Math.min(limit, MAX_CATALOG_ITEMS),
        offset,
      ],
    )) as BusinessCard[]

    return rows
  }

  /** The catalog feed: one card per service in a place, like products on a marketplace. */
  async listOffers({
    kind,
    q,
    offset = 0,
    limit = MAX_OFFERS,
    sort = 'popular',
    ids,
  }: CatalogQuery) {
    const rows = (await this.dataSource.query(
      `
      SELECT s."id", s."name", s."price"::int AS "price", s."duration_minutes"::int AS "durationMinutes",
        s."is_popular" AS "isPopular",
        b."slug", b."name" AS "businessName", b."kind", b."cover_url" AS "coverUrl", b."logo_url" AS "logoUrl",
        (SELECT ROUND(AVG(sp."rating")::numeric, 1)::float8 FROM "specialists" sp
          WHERE sp."business_id" = b."id" AND sp."is_active" AND sp."rating" IS NOT NULL) AS "rating",
        (SELECT br."address" FROM "branches" br
          WHERE br."business_id" = b."id" AND br."is_active" ORDER BY br."position" LIMIT 1) AS "address",
        -- The biggest open promotion on this service (not codes): «−20%» on the catalog card.
        (SELECT MAX(p."percent")::int FROM "promotions" p
          WHERE p."business_id" = b."id" AND p."is_active" AND p."kind" <> 'promo_code'
            AND (p."service_ids" IS NULL OR s."id" = ANY(p."service_ids"))
            AND (p."ends_on" IS NULL OR p."ends_on" >= (now() AT TIME ZONE 'UTC' + interval '6 hours')::date)
            AND (p."starts_on" IS NULL OR p."starts_on" <= (now() AT TIME ZONE 'UTC' + interval '6 hours')::date)
        ) AS "discountPercent",
        -- The share of other places with this service (same kind, same name) that ask more:
        -- 'Cheaper than 70% of places' under the price. Null with fewer than four to compare with.
        (SELECT CASE WHEN COUNT(*) >= ${MIN_PRICE_PEERS}
            THEN (100 * COUNT(*) FILTER (WHERE o."price" > s."price") / COUNT(*))::int END
          FROM "services" o
          JOIN "businesses" ob ON ob."id" = o."business_id" AND ob."is_published"
          WHERE o."is_active" AND lower(o."name") = lower(s."name")
            AND ob."kind" = b."kind" AND o."business_id" <> s."business_id"
        ) AS "cheaperThanPercent"
      FROM "services" s
      JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
      WHERE s."is_active"
        AND ($1::text IS NULL OR b."kind" = $1)
        AND ($2::text[] IS NULL OR s."name" ILIKE ANY($2::text[]) OR b."name" ILIKE ANY($2::text[]))
        AND ($5::text[] IS NULL OR s."id"::text = ANY($5::text[]))
      ORDER BY ${
        sort === 'price'
          ? 's."price" ASC, s."id" ASC'
          : 's."is_popular" DESC, s."position" ASC, b."created_at" ASC, s."id" ASC'
      }
      LIMIT $3 OFFSET $4
      `,
      [
        kind ?? null,
        q ? ((await this.search.resolve(q))?.patterns ?? null) : null,
        Math.min(limit, MAX_OFFERS),
        offset,
        ids && ids.length > 0 ? ids : null,
      ],
    )) as Offer[]

    return rows
  }

  /** Services offered by most places, for the catalog's 'Popular services' shelf. */
  async listPopularServices(kind?: string) {
    const rows = (await this.dataSource.query(
      `
      SELECT MIN(s."name") AS "name", COUNT(DISTINCT b."id")::int AS "places",
        MIN(s."price")::int AS "minPrice", MIN(s."duration_minutes")::int AS "durationMinutes"
      FROM "services" s
      JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
      WHERE s."is_active" AND ($1::text IS NULL OR b."kind" = $1)
      GROUP BY LOWER(TRIM(s."name"))
      ORDER BY "places" DESC, COUNT(*) DESC, "name" ASC
      LIMIT ${MAX_POPULAR_SERVICES}
      `,
      [kind ?? null],
    )) as { name: string; places: number; minPrice: number; durationMinutes: number }[]

    return rows
  }

  /** 'Similar places': the place's kind ranked by distance, menu, price level and rating. */
  async listSimilar(slug: string, limit = SIMILAR_PLACES): Promise<BusinessCard[]> {
    const business = await this.findBySlug(slug)
    const cards = await this.listCatalog({
      kind: business.kind,
      offset: 0,
      limit: MAX_CATALOG_ITEMS,
      sort: 'popular',
    })
    const rows = (await this.dataSource.query(
      `
      SELECT b."slug",
        COALESCE((
          SELECT json_agg(json_build_object('latitude', br."latitude", 'longitude', br."longitude"))
          FROM "branches" br
          WHERE br."business_id" = b."id" AND br."is_active"
            AND br."latitude" IS NOT NULL AND br."longitude" IS NOT NULL
        ), '[]') AS "pins",
        COALESCE((
          SELECT array_agg(s."name") FROM "services" s
          WHERE s."business_id" = b."id" AND s."is_active"
        ), '{}') AS "services"
      FROM "businesses" b
      WHERE b."kind" = $1 AND (b."is_published" OR b."id" = $2)
      `,
      [business.kind, business.id],
    )) as { slug: string; pins: PlaceSignals['pins']; services: string[] }[]
    const cardBySlug = new Map(cards.map((card) => [card.slug, card]))
    const signals = (row: (typeof rows)[number]): PlaceSignals => {
      const card = cardBySlug.get(row.slug)
      return {
        ...row,
        minPrice: card?.minPrice ?? null,
        rating: card?.rating ?? null,
        reviewsCount: card?.reviewsCount ?? 0,
      }
    }
    const target = rows.find((row) => row.slug === slug)
    if (!target) return []
    const candidates = rows.filter((row) => cardBySlug.has(row.slug)).map(signals)

    return rankSimilarPlaces(signals(target), candidates)
      .slice(0, limit)
      .flatMap((candidate) => cardBySlug.get(candidate) ?? [])
  }

  async findBySlug(slug: string, { publishedOnly = true } = {}) {
    const business = await this.businesses.findOne({
      where: publishedOnly ? { slug, isPublished: true } : { slug },
      relations: { hours: true },
    })
    if (!business) throw new NotFoundException('Page not found')

    return business
  }

  async findById(id: string) {
    return this.businesses.findOneOrFail({ where: { id }, relations: { hours: true } })
  }

  toView(business: Business) {
    return toBusinessView(business)
  }

  /** The business view with its branches: active ones for clients, all of them for the cabinet. */
  async toFullView(business: Business, { includeInactive = false } = {}) {
    const [branches, photos] = await Promise.all([
      this.listBranches(business.id, includeInactive),
      this.businesses.manager.query(
        // The owner's order (the first five lead the page), else newest first.
        `SELECT "url" FROM "work_photos" WHERE "business_id" = $1 AND NOT "is_hidden"
         ORDER BY "position" ASC NULLS FIRST, "created_at" DESC LIMIT 30`,
        [business.id],
      ) as Promise<{ url: string }[]>,
    ])
    return {
      ...toBusinessView(business),
      branches,
      // Newest work first; the cabinet edits them through /manage/:slug/work-photos.
      photos: photos.map((photo) => photo.url),
    }
  }

  async listBranches(businessId: string, includeInactive = false): Promise<BranchView[]> {
    const branches = await this.branches.find({
      where: includeInactive ? { businessId } : { businessId, isActive: true },
      order: { position: 'ASC', createdAt: 'ASC' },
    })

    return branches.map((branch) => toBranchView(branch, includeInactive))
  }

  async saveBranch(business: Business, input: BranchInput, id?: string) {
    const existing = id
      ? await this.branches.findOneBy({ id, businessId: business.id })
      : this.branches.create({
          businessId: business.id,
          position: (await this.branches.countBy({ businessId: business.id })) + 1,
        })
    if (!existing) throw new NotFoundException('Branch not found')
    if (id && !input.isActive && (await this.countActiveBranches(business.id, id)) === 0) {
      throw new BadRequestException('At least one branch must stay open')
    }

    const saved = await this.branches.save({
      ...existing,
      ...input,
      phone: normalizeOptionalPhone(input.phone) ?? '',
    })

    return toBranchView(saved, true)
  }

  async deleteBranch(business: Business, id: string) {
    const branch = await this.branches.findOneBy({ id, businessId: business.id })
    if (!branch) throw new NotFoundException('Branch not found')
    if ((await this.countActiveBranches(business.id, id)) === 0) {
      throw new BadRequestException("You can't delete the only branch")
    }
    // Masters and past bookings keep working: their branch_id becomes null (every branch).
    await this.branches.delete({ id })
  }

  /** Branches with a pin, nearest first when the client shared a location. */
  async listMap({ lat, lng, kind, q }: MapQuery) {
    const hasPoint = lat !== undefined && lng !== undefined
    const rows = (await this.dataSource.query(
      `
      SELECT br."id" AS "branchId", br."name" AS "branchName", br."address",
        br."latitude", br."longitude",
        b."slug", b."name", b."kind", b."cover_url" AS "coverUrl", b."logo_url" AS "logoUrl",
        MIN(s."price")::int AS "minPrice",
        CASE WHEN $1::float8 IS NULL THEN NULL ELSE
          6371 * 2 * ASIN(SQRT(
            POWER(SIN(RADIANS(br."latitude" - $1) / 2), 2) +
            COS(RADIANS($1)) * COS(RADIANS(br."latitude")) * POWER(SIN(RADIANS(br."longitude" - $2) / 2), 2)
          ))
        END AS "distanceKm"
      FROM "branches" br
      JOIN "businesses" b ON b."id" = br."business_id" AND b."is_published"
      JOIN "services" s ON s."business_id" = b."id" AND s."is_active"
      WHERE br."is_active" AND br."latitude" IS NOT NULL AND br."longitude" IS NOT NULL
        AND ($3::text IS NULL OR b."kind" = $3)
        AND ($4::text[] IS NULL OR b."name" ILIKE ANY($4::text[]) OR br."address" ILIKE ANY($4::text[])
          OR EXISTS (
            SELECT 1 FROM "services" sq
            WHERE sq."business_id" = b."id" AND sq."is_active" AND sq."name" ILIKE ANY($4::text[])
          ))
      GROUP BY br."id", b."id"
      ORDER BY "distanceKm" ASC NULLS LAST, b."name" ASC
      LIMIT ${MAX_MAP_ITEMS}
      `,
      [
        hasPoint ? lat : null,
        hasPoint ? lng : null,
        kind ?? null,
        q ? ((await this.search.resolve(q))?.patterns ?? null) : null,
      ],
    )) as (Omit<MapPlace, 'latitude' | 'longitude'> & { latitude: string; longitude: string })[]

    return rows.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceKm: row.distanceKm === null ? null : Math.round(Number(row.distanceKm) * 10) / 10,
    }))
  }

  private async countActiveBranches(businessId: string, exceptId: string) {
    return this.branches
      .createQueryBuilder('branch')
      .where('branch.businessId = :businessId', { businessId })
      .andWhere('branch.isActive = true')
      .andWhere('branch.id != :exceptId', { exceptId })
      .getCount()
  }

  async getOpeningWindow(businessId: string, dateKey: string) {
    const day = await this.hours.findOneBy({ businessId, weekday: weekdayOf(dateKey) })

    return day ? { opensMinutes: day.opensMinutes, closesMinutes: day.closesMinutes } : null
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return []
    return this.businesses.findBy({ id: In(ids) })
  }

  /** `getOpeningWindow` for many businesses and days in one query, keyed `businessId:dateKey`. */
  async getOpeningWindows(businessIds: string[], dateKeys: string[]) {
    const windows = new Map<string, { opensMinutes: number; closesMinutes: number } | null>()
    if (businessIds.length === 0 || dateKeys.length === 0) return windows
    const rows = await this.hours.findBy({
      businessId: In(businessIds),
      weekday: In([...new Set(dateKeys.map(weekdayOf))]),
    })
    for (const businessId of businessIds) {
      for (const dateKey of dateKeys) {
        const day = rows.find(
          (row) => row.businessId === businessId && row.weekday === weekdayOf(dateKey),
        )
        windows.set(
          `${businessId}:${dateKey}`,
          day ? { opensMinutes: day.opensMinutes, closesMinutes: day.closesMinutes } : null,
        )
      }
    }

    return windows
  }

  async checkSlug(slug: string) {
    const problem = getSlugProblem(slug)
    if (problem) return { available: false, reason: problem }
    const taken = await this.businesses.existsBy({ slug })

    return taken ? { available: false, reason: 'This address is taken' } : { available: true }
  }

  async create(input: CreateBusinessInput, owner: Customer) {
    const { available, reason } = await this.checkSlug(input.slug)
    if (!available) throw new ConflictException(reason)

    const phone = normalizeOptionalPhone(input.phone) || owner.phone

    return this.dataSource.transaction(async (manager) => {
      const business = await manager.save(
        manager.create(Business, {
          slug: input.slug,
          name: input.name,
          kind: input.kind as Business['kind'],
          city: input.city,
          address: input.address,
          phone,
          whatsapp: phone,
        }),
      )
      await manager.save(
        manager.create(BusinessMember, {
          businessId: business.id,
          customerId: owner.id,
          role: 'owner',
        }),
      )
      // A new business tries the paid plan first, then pays or stays on the free one.
      await this.billing.startTrial(business.id, manager)
      await manager.save(
        Array.from({ length: 7 }, (_, weekday) =>
          manager.create(WorkingHours, { businessId: business.id, weekday, ...DEFAULT_HOURS }),
        ),
      )
      await manager.save(
        manager.create(Branch, {
          businessId: business.id,
          name: 'Main',
          address: input.address,
          phone,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          position: 1,
        }),
      )
      const category = await manager.save(
        manager.create(Category, {
          id: randomUUID(),
          businessId: business.id,
          name: 'Services',
          position: 1,
        }),
      )
      if (input.services.length > 0) {
        await manager.save(
          input.services.map((service, index) =>
            manager.create(Service, {
              id: randomUUID(),
              businessId: business.id,
              categoryId: category.id,
              description: '',
              position: index + 1,
              ...service,
            }),
          ),
        )
      }

      return toBusinessView(
        await manager.findOneOrFail(Business, {
          where: { id: business.id },
          relations: { hours: true },
        }),
      )
    })
  }

  async update(business: Business, input: UpdateBusinessInput) {
    await this.businesses.update(
      { id: business.id },
      {
        ...input,
        kind: input.kind as Business['kind'] | undefined,
        phone: normalizeOptionalPhone(input.phone),
        whatsapp: normalizeOptionalPhone(input.whatsapp),
      },
    )

    return toBusinessView(await this.findById(business.id))
  }

  async setHours(business: Business, days: HoursInput) {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(WorkingHours, { businessId: business.id })
      await manager.save(
        days.map((day) => manager.create(WorkingHours, { businessId: business.id, ...day })),
      )
    })

    return toBusinessView(await this.findById(business.id))
  }

  async isMember(businessId: string, customerId: string) {
    return this.members.existsBy({ businessId, customerId })
  }

  async memberRole(businessId: string, customerId: string) {
    return (await this.members.findOneBy({ businessId, customerId }))?.role ?? null
  }

  /** Businesses the account runs and places where it is a master, for profile shortcuts. */
  async shortcutsFor(customer: Customer) {
    const [businesses, masterOf] = await Promise.all([
      this.dataSource.query(
        `SELECT b."slug", b."name", m."role" FROM "business_members" m
         JOIN "businesses" b ON b."id" = m."business_id"
         WHERE m."customer_id" = $1 ORDER BY m."created_at"`,
        [customer.id],
      ) as Promise<{ slug: string; name: string; role: 'owner' | 'staff' }[]>,
      this.dataSource.query(
        `SELECT DISTINCT b."slug", b."name" FROM "specialists" s
         JOIN "businesses" b ON b."id" = s."business_id"
         WHERE s."phone" = $1 AND s."is_active" ORDER BY b."name"`,
        [customer.phone],
      ) as Promise<{ slug: string; name: string }[]>,
    ])
    return { businesses, masterOf }
  }

  async listForCustomer(customer: Customer, isPlatformAdmin: boolean) {
    const memberships = await this.members.find({
      where: { customerId: customer.id },
      relations: { business: true },
      order: { createdAt: 'ASC' },
    })
    const roles = new Map(memberships.map((member) => [member.businessId, member.role]))
    const businesses = isPlatformAdmin
      ? await this.businesses.find({ order: { createdAt: 'ASC' } })
      : memberships
          .map((member) => member.business)
          .filter((business): business is Business => Boolean(business))
    if (businesses.length === 0) return []

    // Today at a glance for each business: how many visits and who is next.
    const now = new Date()
    const today = toBusinessParts(now).dateKey
    const stats = (await this.dataSource.query(
      `
      SELECT b."id",
        COUNT(bk."id") FILTER (WHERE bk."starts_at" >= $2 AND bk."starts_at" < $3)::int AS "todayCount",
        MIN(bk."starts_at") FILTER (WHERE bk."starts_at" >= $4) AS "nextStartsAt"
      FROM "businesses" b
      LEFT JOIN "bookings" bk ON bk."business_id" = b."id" AND bk."status" = 'confirmed'
      WHERE b."id" = ANY($1)
      GROUP BY b."id"
      `,
      [
        businesses.map(({ id }) => id),
        businessDateTimeToUtc(today, 0),
        businessDateTimeToUtc(addDays(today, 1), 0),
        now,
      ],
    )) as { id: string; todayCount: number; nextStartsAt: Date | null }[]
    const statsById = new Map(stats.map((row) => [row.id, row]))

    return businesses.map(({ id, slug, name, kind, isPublished, coverUrl, logoUrl }) => {
      const next = statsById.get(id)?.nextStartsAt
      const nextParts = next ? toBusinessParts(new Date(next)) : null

      return {
        slug,
        name,
        kind,
        isPublished,
        coverUrl,
        logoUrl,
        role: (roles.get(id) ?? 'admin') as BusinessLink['role'],
        todayCount: statsById.get(id)?.todayCount ?? 0,
        next: nextParts
          ? { date: nextParts.dateKey, time: formatMinutes(nextParts.minutes) }
          : null,
      }
    })
  }
}

export type { BusinessCard, BusinessView }
