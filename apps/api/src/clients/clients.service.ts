import type { PaymentMethod, VisitOutcome } from '@awaisa/contracts'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import type { Business } from '../businesses/business.entity.js'
import { formatMinutes, toBusinessParts } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import { ClientRecord } from './client-record.entity.js'
import { LAPSED_DAYS, segmentClients } from './client-segments.js'
import type { ClientsQuery, UpdateClientInput } from './clients.schemas.js'

type Row = Record<string, unknown>

const HISTORY_LIMIT = 50

// A visit is a confirmed booking that has started and was not a no-show; it earns what was paid
// (or the price, when nobody marked the payment).
const VISIT = `b."status" = 'confirmed' AND b."starts_at" <= now() AND b."outcome" IS DISTINCT FROM 'no_show'`
const EARNED = 'COALESCE(b."paid_amount", s."price" - COALESCE(b."discount_amount", 0))'

const toNumber = (value: unknown) => Number(value ?? 0)
const toDate = (value: unknown) => (value ? new Date(value as string).toISOString() : null)

// The business's client base: everyone who booked, grouped by phone, with what they brought.
@Injectable()
export class ClientsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ClientRecord) private readonly records: Repository<ClientRecord>,
  ) {}

  /**
   * Everyone who booked or was imported, matching the search, cut to one segment in the asked
   * order (`client-segments.ts`), with every segment's size for the tabs. Grouped in SQL, cut in
   * code: a business's base is thousands of rows at most.
   */
  async list(business: Business, { q, segment, sort, limit }: ClientsQuery) {
    const search = `%${q.replace(/[%_]/g, '')}%`
    const rows = (await this.dataSource.query(
      `SELECT b."customer_phone" AS "phone",
         (ARRAY_AGG(b."customer_name" ORDER BY b."starts_at" DESC))[1] AS "name",
         COUNT(*) FILTER (WHERE ${VISIT})::int AS "visits",
         COUNT(*) FILTER (WHERE b."outcome" = 'no_show')::int AS "noShows",
         COALESCE(SUM(${EARNED}) FILTER (WHERE ${VISIT}), 0)::int AS "spent",
         MAX(b."starts_at") FILTER (WHERE ${VISIT}) AS "lastVisit",
         MIN(b."starts_at") FILTER (WHERE b."status" = 'confirmed' AND b."starts_at" > now()) AS "nextVisit",
         BOOL_OR(cr."note" <> '') AS "hasNote",
         to_char(MAX(cr."birthday"), 'YYYY-MM-DD') AS "birthday"
       FROM "bookings" b
       JOIN "services" s ON s."id" = b."service_id"
       LEFT JOIN "client_records" cr ON cr."business_id" = b."business_id" AND cr."phone" = b."customer_phone"
       WHERE b."business_id" = $1
       GROUP BY b."customer_phone"
       HAVING $2 = '%%' OR b."customer_phone" ILIKE $2
         OR (ARRAY_AGG(b."customer_name" ORDER BY b."starts_at" DESC))[1] ILIKE $2
       UNION ALL
       -- Imported clients who have not booked here yet.
       SELECT cr."phone", cr."name", 0, 0, 0, NULL, NULL, cr."note" <> '',
         to_char(cr."birthday", 'YYYY-MM-DD')
       FROM "client_records" cr
       WHERE cr."business_id" = $1 AND cr."name" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "bookings" x
           WHERE x."business_id" = cr."business_id" AND x."customer_phone" = cr."phone")
         AND ($2 = '%%' OR cr."phone" ILIKE $2 OR cr."name" ILIKE $2)`,
      [business.id, search],
    )) as Row[]

    const clients = rows.map((row) => ({
      phone: String(row.phone),
      name: String(row.name ?? ''),
      visits: toNumber(row.visits),
      noShows: toNumber(row.noShows),
      spent: toNumber(row.spent),
      lastVisit: toDate(row.lastVisit),
      nextVisit: toDate(row.nextVisit),
      hasNote: Boolean(row.hasNote),
      birthday: (row.birthday as string | null) ?? null,
    }))
    const now = new Date()
    const { items, counts } = segmentClients(
      clients,
      segment,
      sort,
      now,
      toBusinessParts(now).dateKey,
    )

    return { items: items.slice(0, limit), counts, lapsedDays: LAPSED_DAYS }
  }

  async get(business: Business, rawPhone: string) {
    const phone = this.toPhone(rawPhone)
    const history = (await this.dataSource.query(
      `SELECT b."id", b."starts_at" AS "startsAt", b."status", b."outcome", b."paid_amount" AS "paidAmount",
         b."payment_method" AS "paymentMethod", b."customer_name" AS "name",
         s."name" AS "serviceName", (s."price" - COALESCE(b."discount_amount", 0)) AS "price",
         sp."name" AS "specialistName",
         r."rating", r."comment" AS "reviewComment"
       FROM "bookings" b
       JOIN "services" s ON s."id" = b."service_id"
       LEFT JOIN "specialists" sp ON sp."id" = b."specialist_id"
       LEFT JOIN "reviews" r ON r."booking_id" = b."id"
       WHERE b."business_id" = $1 AND b."customer_phone" = $2
       ORDER BY b."starts_at" DESC
       LIMIT ${HISTORY_LIMIT}`,
      [business.id, phone],
    )) as Row[]
    const record = await this.records.findOneBy({ businessId: business.id, phone })
    if (history.length === 0 && !record?.name) throw new NotFoundException('Клиент не найден')
    const now = Date.now()
    const isVisit = (row: Row) =>
      row.status === 'confirmed' &&
      new Date(row.startsAt as string).getTime() <= now &&
      row.outcome !== 'no_show'
    const visits = history.filter(isVisit)
    const spent = visits.reduce((sum, row) => sum + toNumber(row.paidAmount ?? row.price), 0)
    const favorite = (key: string) => {
      const counts = new Map<string, number>()
      for (const row of visits)
        counts.set(String(row[key]), (counts.get(String(row[key])) ?? 0) + 1)
      return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? null
    }
    const upcoming = history
      .filter(
        (row) => row.status === 'confirmed' && new Date(row.startsAt as string).getTime() > now,
      )
      .at(-1)

    return {
      phone,
      name: String(history[0]?.name ?? record?.name ?? ''),
      note: record?.note ?? '',
      birthday: record?.birthday ?? null,
      stats: {
        visits: visits.length,
        noShows: history.filter((row) => row.outcome === 'no_show').length,
        cancellations: history.filter((row) => row.status === 'cancelled').length,
        spent,
        averageCheck: visits.length === 0 ? 0 : Math.round(spent / visits.length),
        firstVisit: toDate(visits.at(-1)?.startsAt),
        lastVisit: toDate(visits[0]?.startsAt),
        nextVisit: toDate(upcoming?.startsAt),
        favoriteService: favorite('serviceName'),
        favoriteMaster: favorite('specialistName'),
      },
      history: history.map((row) => {
        const { dateKey, minutes } = toBusinessParts(new Date(row.startsAt as string))
        return {
          id: String(row.id),
          date: dateKey,
          time: formatMinutes(minutes),
          status: String(row.status),
          outcome: (row.outcome as VisitOutcome | null) ?? null,
          paidAmount: row.paidAmount === null ? null : toNumber(row.paidAmount),
          paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
          price: toNumber(row.price),
          serviceName: String(row.serviceName),
          specialistName: String(row.specialistName ?? ''),
          rating: row.rating === null ? null : toNumber(row.rating),
          reviewComment: (row.reviewComment as string | null) ?? null,
        }
      }),
    }
  }

  async update(business: Business, rawPhone: string, input: UpdateClientInput) {
    const phone = this.toPhone(rawPhone)
    await this.records.upsert(
      { businessId: business.id, phone, note: input.note, birthday: input.birthday },
      ['businessId', 'phone'],
    )

    return { phone, note: input.note, birthday: input.birthday }
  }

  private toPhone(raw: string) {
    const phone = normalizePhone(raw)
    if (!phone) throw new NotFoundException('Клиент не найден')
    return phone
  }
}
