import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
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
  photos: string[]
  hours: { weekday: number; opensMinutes: number; closesMinutes: number }[]
}

type BusinessCard = Pick<
  BusinessView,
  'slug' | 'name' | 'kind' | 'description' | 'city' | 'address'
> & {
  servicesCount: number
  minPrice: number
  coverUrl: string | null
  hours: { weekday: number; opensMinutes: number; closesMinutes: number }[]
}

const MAX_CATALOG_ITEMS = 60

const MAX_MAP_ITEMS = 200

const MAX_POPULAR_SERVICES = 12

const MAX_OFFERS = 60

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
  photos: business.photos ?? [],
  hours: (business.hours ?? [])
    .map(({ weekday, opensMinutes, closesMinutes }) => ({ weekday, opensMinutes, closesMinutes }))
    .sort((first, second) => first.weekday - second.weekday),
})

const normalizeOptionalPhone = (value: string | undefined) => {
  if (value === undefined || value === '') return value
  const phone = normalizePhone(value)
  if (!phone) throw new BadRequestException('Укажите корректный номер телефона')

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
  ) {}

  async listCatalog({ kind, q }: CatalogQuery): Promise<BusinessCard[]> {
    const rows = (await this.dataSource.query(
      `
      SELECT b."slug", b."name", b."kind", b."description", b."city", b."address",
        b."cover_url" AS "coverUrl",
        COUNT(s."id")::int AS "servicesCount", MIN(s."price")::int AS "minPrice",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'weekday', h."weekday", 'opensMinutes', h."opens_minutes", 'closesMinutes', h."closes_minutes"
          ) ORDER BY h."weekday"), '[]')
          FROM "working_hours" h WHERE h."business_id" = b."id"
        ) AS "hours"
      FROM "businesses" b
      JOIN "services" s ON s."business_id" = b."id" AND s."is_active"
      WHERE b."is_published"
        AND ($1::text IS NULL OR b."kind" = $1)
        AND ($2::text IS NULL OR b."name" ILIKE $2 OR b."address" ILIKE $2 OR b."description" ILIKE $2
          OR EXISTS (
            SELECT 1 FROM "services" sq
            WHERE sq."business_id" = b."id" AND sq."is_active" AND sq."name" ILIKE $2
          ))
      GROUP BY b."id"
      ORDER BY b."created_at" ASC
      LIMIT ${MAX_CATALOG_ITEMS}
      `,
      [kind ?? null, q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null],
    )) as BusinessCard[]

    return rows
  }

  /** The catalog feed: one card per service in a place, like products on a marketplace. */
  async listOffers({ kind, q }: CatalogQuery) {
    const rows = (await this.dataSource.query(
      `
      SELECT s."id", s."name", s."price"::int AS "price", s."duration_minutes"::int AS "durationMinutes",
        s."is_popular" AS "isPopular",
        b."slug", b."name" AS "businessName", b."kind", b."cover_url" AS "coverUrl",
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
        ) AS "discountPercent"
      FROM "services" s
      JOIN "businesses" b ON b."id" = s."business_id" AND b."is_published"
      WHERE s."is_active"
        AND ($1::text IS NULL OR b."kind" = $1)
        AND ($2::text IS NULL OR s."name" ILIKE $2 OR b."name" ILIKE $2)
      ORDER BY s."is_popular" DESC, s."position" ASC, b."created_at" ASC
      LIMIT ${MAX_OFFERS}
      `,
      [kind ?? null, q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null],
    )) as Record<string, unknown>[]

    return rows
  }

  /** Services offered by most places, for the catalog's «Популярные услуги» shelf. */
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

  async findBySlug(slug: string, { publishedOnly = true } = {}) {
    const business = await this.businesses.findOne({
      where: publishedOnly ? { slug, isPublished: true } : { slug },
      relations: { hours: true },
    })
    if (!business) throw new NotFoundException('Страница не найдена')

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
    return {
      ...toBusinessView(business),
      branches: await this.listBranches(business.id, includeInactive),
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
    if (!existing) throw new NotFoundException('Филиал не найден')
    if (id && !input.isActive && (await this.countActiveBranches(business.id, id)) === 0) {
      throw new BadRequestException('Нужен хотя бы один открытый филиал')
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
    if (!branch) throw new NotFoundException('Филиал не найден')
    if ((await this.countActiveBranches(business.id, id)) === 0) {
      throw new BadRequestException('Нельзя удалить единственный филиал')
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
        b."slug", b."name", b."kind", b."cover_url" AS "coverUrl",
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
        AND ($4::text IS NULL OR b."name" ILIKE $4 OR br."address" ILIKE $4)
      GROUP BY br."id", b."id"
      ORDER BY "distanceKm" ASC NULLS LAST, b."name" ASC
      LIMIT ${MAX_MAP_ITEMS}
      `,
      [
        hasPoint ? lat : null,
        hasPoint ? lng : null,
        kind ?? null,
        q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null,
      ],
    )) as (Record<string, unknown> & { distanceKm: number | null })[]

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

  async checkSlug(slug: string) {
    const problem = getSlugProblem(slug)
    if (problem) return { available: false, reason: problem }
    const taken = await this.businesses.existsBy({ slug })

    return taken ? { available: false, reason: 'Этот адрес занят' } : { available: true }
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
      await manager.save(
        Array.from({ length: 7 }, (_, weekday) =>
          manager.create(WorkingHours, { businessId: business.id, weekday, ...DEFAULT_HOURS }),
        ),
      )
      await manager.save(
        manager.create(Branch, {
          businessId: business.id,
          name: 'Основной',
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
          name: 'Услуги',
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

    return businesses.map(({ id, slug, name, kind, isPublished, coverUrl }) => {
      const next = statsById.get(id)?.nextStartsAt
      const nextParts = next ? toBusinessParts(new Date(next)) : null

      return {
        slug,
        name,
        kind,
        isPublished,
        coverUrl,
        role: roles.get(id) ?? 'admin',
        todayCount: statsById.get(id)?.todayCount ?? 0,
        next: nextParts
          ? { date: nextParts.dateKey, time: formatMinutes(nextParts.minutes) }
          : null,
      }
    })
  }
}

export type { BusinessCard, BusinessView }
