import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm'
import { ANY_SPECIALIST_ID, UNDO_WINDOW_SECONDS } from '../bookings/booking-rules.js'
import { BookingsService } from '../bookings/bookings.service.js'
import { BusinessesService } from '../businesses/businesses.service.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { Service } from '../catalog/service.entity.js'
import { Specialist } from '../catalog/specialist.entity.js'
import { toBusinessParts } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import type { Env } from '../config/env.js'
import type { Customer } from '../customers/customer.entity.js'
import { waitlistFreedMessage } from '../notifications/messages.js'
import { SmsService } from '../notifications/sms.service.js'
import type { JoinWaitlistInput } from './waitlist.schemas.js'
import { WaitlistEntry } from './waitlist-entry.entity.js'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

type WaitlistView = {
  id: string
  status: WaitlistEntry['status']
  date: string
  /** The free time the SMS named, once it went out. */
  notifiedTime: string | null
  service: { id: string; name: string }
  specialist: { id: string; name: string } | null
  business: { name: string; slug: string }
}

// «Сообщить, когда освободится»: a client waits for a full day; when a time opens up (a client
// cancels, the salon frees time, a visit moves) they get one SMS with a link to that time.
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name)

  constructor(
    @InjectRepository(WaitlistEntry) private readonly entries: Repository<WaitlistEntry>,
    @InjectRepository(Specialist) private readonly specialists: Repository<Specialist>,
    @InjectRepository(Service) private readonly services: Repository<Service>,
    private readonly bookings: BookingsService,
    private readonly catalog: CatalogService,
    private readonly businesses: BusinessesService,
    private readonly sms: SmsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async join(input: JoinWaitlistInput, customer: Customer | null) {
    const phone = customer?.phone ?? normalizePhone(input.phone)
    if (!phone) throw new BadRequestException('Укажите корректный номер телефона')

    // Same rules as booking (date range, published page, the master does the service); a day with
    // free time does not need a waitlist — the client books it instead.
    const { slots } = await this.bookings.getAvailability({
      serviceId: input.serviceId,
      specialistId: input.specialistId,
      date: input.date,
      branchId: input.branchId,
    })
    if (slots.some((slot) => slot.isAvailable)) {
      throw new ConflictException('В этот день есть свободное время — выберите его')
    }

    const service = await this.catalog.getActiveService(input.serviceId)
    const specialistId = input.specialistId === ANY_SPECIALIST_ID ? null : input.specialistId
    const token = randomBytes(24).toString('base64url')
    const existing = await this.entries.findOneBy({
      customerPhone: phone,
      serviceId: service.id,
      specialistId: specialistId ?? IsNull(),
      date: input.date,
      status: 'waiting',
    })
    // Joining twice keeps one entry; the new device gets a fresh token for it.
    const entry = await this.entries.save(
      existing
        ? Object.assign(existing, { tokenHash: hashToken(token), customerName: input.name })
        : this.entries.create({
            businessId: service.businessId,
            serviceId: service.id,
            specialistId,
            branchId: input.branchId ?? null,
            date: input.date,
            customerName: input.name,
            customerPhone: phone,
            customerId: customer?.id ?? null,
            tokenHash: hashToken(token),
          }),
    )

    return { ...(await this.toView(entry)), token }
  }

  async findByToken(id: string, token: string) {
    return this.toView(await this.verify(id, token))
  }

  async leave(id: string, token: string) {
    const entry = await this.verify(id, token)
    if (entry.status === 'waiting') {
      entry.status = 'cancelled'
      await this.entries.save(entry)
    }

    return this.toView(entry)
  }

  async listForCustomer(customer: Customer) {
    const today = toBusinessParts(new Date()).dateKey
    const rows = await this.entries.find({
      where: [
        {
          customerId: customer.id,
          date: MoreThanOrEqual(today),
          status: In(['waiting', 'notified']),
        },
        {
          customerPhone: customer.phone,
          date: MoreThanOrEqual(today),
          status: In(['waiting', 'notified']),
        },
      ],
      order: { date: 'ASC', createdAt: 'ASC' },
    })

    return Promise.all(rows.map((entry) => this.toView(entry)))
  }

  async leaveForCustomer(id: string, customer: Customer) {
    const entry = await this.entries.findOneBy({ id })
    if (!entry || (entry.customerId !== customer.id && entry.customerPhone !== customer.phone)) {
      throw new NotFoundException('Не найдено')
    }
    if (entry.status === 'waiting') {
      entry.status = 'cancelled'
      await this.entries.save(entry)
    }

    return this.toView(entry)
  }

  /**
   * Every minute: entries for past days expire; for each waiting group (service, master, day) the
   * availability is checked and, when a time is free, everyone in the group gets one SMS.
   * A cancellation still inside its undo window is not counted yet — it may come back.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyFreed() {
    const today = toBusinessParts(new Date()).dateKey
    await this.entries.update({ status: 'waiting', date: LessThan(today) }, { status: 'expired' })

    const waiting = await this.entries.find({ where: { status: 'waiting' } })
    const groups = new Map<string, WaitlistEntry[]>()
    for (const entry of waiting) {
      const key = `${entry.serviceId}|${entry.specialistId ?? ''}|${entry.branchId ?? ''}|${entry.date}`
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }

    for (const group of groups.values()) {
      const [first] = group
      if (!first) continue
      try {
        if (await this.hasFreshCancellation(first.businessId)) continue
        const { slots } = await this.bookings.getAvailability({
          serviceId: first.serviceId,
          specialistId: first.specialistId ?? ANY_SPECIALIST_ID,
          date: first.date,
          branchId: first.branchId ?? undefined,
        })
        const free = slots.find((slot) => slot.isAvailable)
        if (!free) continue
        await this.notify(group, free.time)
      } catch (error) {
        // The service or master may be gone: the entry cannot be served any more.
        this.logger.warn(`Waitlist group skipped: ${(error as Error).message}`)
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          await this.entries.update(
            { id: In(group.map((entry) => entry.id)), status: 'waiting' },
            { status: 'expired' },
          )
        }
      }
    }
  }

  private async notify(group: WaitlistEntry[], time: string) {
    // Claiming with UPDATE … WHERE status = 'waiting' keeps several instances from texting twice.
    const claimed = await this.entries
      .createQueryBuilder()
      .update()
      .set({ status: 'notified', notifiedTime: time, notifiedAt: () => 'now()' })
      .where({ id: In(group.map((entry) => entry.id)), status: 'waiting' })
      .returning(['id'])
      .execute()
    const ids = new Set((claimed.raw as { id: string }[]).map((row) => row.id))
    if (ids.size === 0) return

    for (const entry of group.filter((item) => ids.has(item.id))) {
      const view = await this.toView({ ...entry, notifiedTime: time })
      const params = new URLSearchParams({
        service: entry.serviceId,
        specialist: entry.specialistId ?? ANY_SPECIALIST_ID,
        date: entry.date,
        time,
        ...(entry.branchId ? { branch: entry.branchId } : {}),
      })
      const link = `${this.config.get('PUBLIC_WEB_URL', { infer: true })}/${view.business.slug}/book?${params}`
      void this.sms.sendSafely(
        entry.customerPhone,
        waitlistFreedMessage(view.business.name, view.service.name, entry.date, time, link),
      )
    }
    this.logger.log(`Waitlist: ${ids.size} notified`)
  }

  private async hasFreshCancellation(businessId: string) {
    const rows: unknown[] = await this.entries.manager.query(
      `SELECT 1 FROM "bookings" WHERE "business_id" = $1 AND "status" = 'cancelled'
         AND "cancelled_at" > now() - make_interval(secs => $2) LIMIT 1`,
      [businessId, UNDO_WINDOW_SECONDS],
    )
    return rows.length > 0
  }

  private async verify(id: string, token: string) {
    const entry = await this.entries.findOneBy({ id })
    const expected = Buffer.from(entry?.tokenHash ?? '', 'hex')
    const actual = Buffer.from(hashToken(token), 'hex')
    if (!entry || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new NotFoundException('Не найдено')
    }

    return entry
  }

  private async toView(entry: WaitlistEntry): Promise<WaitlistView> {
    const [service, business, specialist] = await Promise.all([
      this.services.findOneBy({ id: entry.serviceId }),
      this.businesses.findById(entry.businessId),
      entry.specialistId ? this.specialists.findOneBy({ id: entry.specialistId }) : null,
    ])

    return {
      id: entry.id,
      status: entry.status,
      date: entry.date,
      notifiedTime: entry.notifiedTime,
      service: { id: entry.serviceId, name: service?.name ?? '' },
      specialist: specialist ? { id: specialist.id, name: specialist.name } : null,
      business: { name: business.name, slug: business.slug },
    }
  }
}

export type { WaitlistView }
