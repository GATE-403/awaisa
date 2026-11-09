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
import { weekdayOf } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { Customer } from '../customers/customer.entity.js'
import { Business } from './business.entity.js'
import { BusinessMember } from './business-member.entity.js'
import { DEFAULT_HOURS, getSlugProblem } from './business-rules.js'
import type {
  CatalogQuery,
  CreateBusinessInput,
  HoursInput,
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
        AND ($2::text IS NULL OR b."name" ILIKE $2 OR b."address" ILIKE $2 OR b."description" ILIKE $2)
      GROUP BY b."id"
      ORDER BY b."created_at" ASC
      LIMIT ${MAX_CATALOG_ITEMS}
      `,
      [kind ?? null, q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null],
    )) as BusinessCard[]

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
    const businesses = isPlatformAdmin
      ? await this.businesses.find({ order: { createdAt: 'ASC' } })
      : (
          await this.members.find({
            where: { customerId: customer.id },
            relations: { business: true },
            order: { createdAt: 'ASC' },
          })
        )
          .map((member) => member.business)
          .filter((business): business is Business => Boolean(business))

    return businesses.map(({ slug, name, isPublished }) => ({ slug, name, isPublished }))
  }
}

export type { BusinessCard, BusinessView }
