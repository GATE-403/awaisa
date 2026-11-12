import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryFailedError, Repository } from 'typeorm'
import { Service } from '../catalog/service.entity.js'
import { toBusinessParts, weekdayOf } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import {
  bestDiscount,
  type Discount,
  isKnownCode,
  normalizeCode,
  type PromotionRule,
} from './pricing.js'
import { Promotion } from './promotion.entity.js'
import type { PromotionInput } from './promotions.schemas.js'

type PriceRequest = {
  businessId: string
  serviceId: string
  price: number
  date: string
  minutes: number
  phone: string | null
  code: string | null
}

const toRule = (promotion: Promotion): PromotionRule => ({
  id: promotion.id,
  title: promotion.title,
  kind: promotion.kind,
  percent: promotion.percent,
  code: promotion.code,
  weekdays: promotion.weekdays,
  fromMinutes: promotion.fromMinutes,
  toMinutes: promotion.toMinutes,
  serviceIds: promotion.serviceIds,
  startsOn: promotion.startsOn,
  endsOn: promotion.endsOn,
  isActive: promotion.isActive,
})

// What the client may see: everything but the codes themselves.
const toPublic = (promotion: Promotion) => ({
  id: promotion.id,
  title: promotion.title,
  kind: promotion.kind,
  percent: promotion.percent,
  weekdays: promotion.weekdays,
  fromMinutes: promotion.fromMinutes,
  toMinutes: promotion.toMinutes,
  serviceIds: promotion.serviceIds,
  endsOn: promotion.endsOn,
})

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion) private readonly promotions: Repository<Promotion>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
  ) {}

  list(businessId: string) {
    return this.promotions.find({ where: { businessId }, order: { createdAt: 'DESC' } })
  }

  async create(businessId: string, input: PromotionInput) {
    return this.uniqueCode(() =>
      this.promotions.save(this.promotions.create({ businessId, ...this.clean(input) })),
    )
  }

  async update(businessId: string, id: string, input: PromotionInput) {
    await this.findOwned(businessId, id)
    await this.uniqueCode(() => this.promotions.update({ id, businessId }, this.clean(input)))
    return this.findOwned(businessId, id)
  }

  private async uniqueCode<T>(run: () => Promise<T>) {
    try {
      return await run()
    } catch (error) {
      const code = (error as QueryFailedError & { driverError?: { code?: string } }).driverError
        ?.code
      if (error instanceof QueryFailedError && code === '23505') {
        throw new ConflictException('Такой промокод уже есть')
      }
      throw error
    }
  }

  async remove(businessId: string, id: string) {
    await this.findOwned(businessId, id)
    await this.promotions.delete({ id, businessId })
  }

  /** Active promotions a client can see on the business page (codes stay hidden). */
  async publicForSlug(slug: string) {
    const [business] = (await this.promotions.manager.query(
      'SELECT "id" FROM "businesses" WHERE "slug" = $1 AND "is_published"',
      [slug],
    )) as { id: string }[]
    if (!business) throw new NotFoundException('Бизнес не найден')

    return this.publicFor(business.id)
  }

  async publicFor(businessId: string) {
    const today = toBusinessParts(new Date()).dateKey
    const rows = await this.promotions.find({ where: { businessId, isActive: true } })

    return rows
      .filter((row) => row.kind !== 'promo_code' && (!row.endsOn || row.endsOn >= today))
      .map(toPublic)
  }

  /**
   * The discount a visit gets: the single best active promotion. A code the business does not
   * have is an error the client should see; a code that exists but does not fit is just ignored.
   */
  async discountFor(request: PriceRequest): Promise<Discount | null> {
    const rules = (await this.promotions.find({ where: { businessId: request.businessId } })).map(
      toRule,
    )
    if (rules.length === 0) {
      if (normalizeCode(request.code)) throw new BadRequestException('Такого промокода нет')
      return null
    }
    if (normalizeCode(request.code) && !isKnownCode(rules, request.code)) {
      throw new BadRequestException('Такого промокода нет')
    }

    return bestDiscount(rules, {
      serviceId: request.serviceId,
      price: request.price,
      date: request.date,
      weekday: weekdayOf(request.date),
      minutes: request.minutes,
      isFirstVisit: request.phone
        ? await this.isFirstVisit(request.businessId, request.phone)
        : false,
      code: request.code,
    })
  }

  /** The booking form asks before the client commits: price, discount, whether the code works. */
  async quote(
    query: { serviceId: string; date: string; time: string; code?: string; phone?: string },
    accountPhone: string | null,
  ) {
    const service = await this.services.findOneBy({ id: query.serviceId, isActive: true })
    if (!service) throw new NotFoundException('Услуга не найдена')
    const [hours = 0, minutes = 0] = query.time.split(':').map(Number)
    const phone = accountPhone ?? (query.phone ? normalizePhone(query.phone) : null)
    const discount = await this.discountFor({
      businessId: service.businessId,
      serviceId: service.id,
      price: service.price,
      date: query.date,
      minutes: hours * 60 + minutes,
      phone,
      code: query.code ?? null,
    })

    return { price: service.price, discount, total: service.price - (discount?.amount ?? 0) }
  }

  private async isFirstVisit(businessId: string, phone: string) {
    const rows: unknown[] = await this.promotions.manager.query(
      `SELECT 1 FROM "bookings" WHERE "business_id" = $1 AND "customer_phone" = $2
         AND "status" = 'confirmed' LIMIT 1`,
      [businessId, phone],
    )
    return rows.length === 0
  }

  private clean(input: PromotionInput) {
    const isHours = input.kind === 'happy_hours'
    return {
      ...input,
      code: input.kind === 'promo_code' ? normalizeCode(input.code) : null,
      weekdays: isHours && input.weekdays?.length ? [...new Set(input.weekdays)].sort() : null,
      fromMinutes: isHours ? input.fromMinutes : null,
      toMinutes: isHours ? input.toMinutes : null,
      serviceIds: input.serviceIds?.length ? input.serviceIds : null,
    }
  }

  private async findOwned(businessId: string, id: string) {
    const promotion = await this.promotions.findOneBy({ id, businessId })
    if (!promotion) throw new NotFoundException('Акция не найдена')
    return promotion
  }
}
