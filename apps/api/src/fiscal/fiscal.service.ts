import type { FiscalReceipt, FiscalSettings, TaxRegime } from '@awaisa/contracts'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { BillingService } from '../billing/billing.service.js'
import type { Env } from '../config/env.js'
import type { FiscalSettingsBody } from './fiscal.schemas.js'
import {
  createEkassaDriver,
  createLogDriver,
  type FiscalDriver,
  FiscalSendError,
} from './fiscal-drivers.js'
import {
  type ActiveReceipt,
  buildReceipt,
  type FiscalDocument,
  type FiscalTaxes,
  hasGivenUp,
  nextAttemptDelayMs,
  planReceipts,
  visitReceiptItems,
} from './receipt.js'
import { isReceiptSignature, receiptSignature } from './receipt-signature.js'
import { open, seal } from './secret-box.js'

type Row = Record<string, unknown>

type Source = {
  businessId: string
  branchId: string | null
  saleId: string | null
  bookingId: string | null
}

type Settings = FiscalTaxes & {
  isEnabled: boolean
  inn: string | null
  taxRegime: TaxRegime
  login: string | null
  secret: string | null
}

const BATCH = 50
// A send that never came back (the process died) is picked up again after this.
const SENDING_TIMEOUT_MINUTES = 5
const LIVE = `('pending', 'sending', 'issued', 'failed')`

const toNumber = (value: unknown) => Number(value ?? 0)
const toIso = (value: unknown) =>
  (value instanceof Date ? value : new Date(String(value))).toISOString()

/**
 * Fiscal receipts for the counter: a product sale, the money paid at a visit and their refunds.
 * Receipts go into a queue and are sent after the sale or the visit is saved, so a provider
 * that is down never fails the sale: the queue retries (1, 2, 4 … minutes) and the owner can
 * send one again by hand. Which provider is FISCAL_DRIVER; each business brings its own ИНН
 * and its own login at that provider («Настройки → Касса»).
 */
@Injectable()
export class FiscalService {
  private readonly logger = new Logger('Fiscal')
  private readonly driver: FiscalDriver | null

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<Env, true>,
    private readonly billing: BillingService,
  ) {
    const name = config.get('FISCAL_DRIVER', { infer: true })
    this.driver =
      name === 'log'
        ? createLogDriver((message) => this.logger.log(message))
        : name === 'ekassa'
          ? createEkassaDriver(config.get('EKASSA_API_URL', { infer: true }))
          : null
  }

  get driverName() {
    return this.config.get('FISCAL_DRIVER', { infer: true })
  }

  async getSettings(businessId: string): Promise<FiscalSettings> {
    const settings = await this.loadSettings(this.dataSource.manager, businessId)
    return {
      driver: this.driverName,
      isEnabled: settings.isEnabled,
      inn: settings.inn,
      taxRegime: settings.taxRegime,
      isVatPayer: settings.isVatPayer,
      vatRate: settings.vatRate,
      salesTaxServices: settings.salesTaxServices,
      salesTaxGoods: settings.salesTaxGoods,
      login: settings.login,
      hasPassword: settings.secret !== null,
    }
  }

  async saveSettings(businessId: string, input: FiscalSettingsBody) {
    const secret = input.password ? seal(input.password, this.authSecret) : null
    await this.dataSource.query(
      `INSERT INTO "fiscal_settings" ("business_id", "is_enabled", "inn", "tax_regime",
         "is_vat_payer", "vat_rate", "sales_tax_services", "sales_tax_goods", "provider_login",
         "provider_secret")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("business_id") DO UPDATE SET "is_enabled" = $2, "inn" = $3, "tax_regime" = $4,
         "is_vat_payer" = $5, "vat_rate" = $6, "sales_tax_services" = $7, "sales_tax_goods" = $8,
         "provider_login" = $9,
         "provider_secret" = COALESCE($10, "fiscal_settings"."provider_secret"),
         "updated_at" = now()`,
      [
        businessId,
        input.isEnabled,
        input.inn ?? null,
        input.taxRegime,
        input.isVatPayer,
        input.vatRate,
        input.salesTaxServices,
        input.salesTaxGoods,
        input.login?.trim() || null,
        secret,
      ],
    )
    return this.getSettings(businessId)
  }

  /** Whether the cabinet's settings row should say «Включены». */
  async isOn(businessId: string) {
    if (!this.driver) return false
    return (await this.loadSettings(this.dataSource.manager, businessId)).isEnabled
  }

  /**
   * After a sale is made or cancelled: a receipt for the products, or a refund of it. Never
   * throws: the sale is already saved and must stand whatever happens here.
   */
  async syncSale(businessId: string, saleId: string) {
    await this.safely(`sale ${saleId}`, async () => {
      const ids = await this.dataSource.transaction(async (manager) => {
        const [sale] = this.rows(
          await manager.query(
            `SELECT "branch_id", "payment_method", "cancelled_at" FROM "sales"
             WHERE "id" = $1 AND "business_id" = $2`,
            [saleId, businessId],
          ),
        )
        if (!sale) return []
        const items = this.rows(
          await manager.query(
            'SELECT "name", "quantity", "price" FROM "sale_items" WHERE "sale_id" = $1 ORDER BY "name"',
            [saleId],
          ),
        )
        return this.reconcile(
          manager,
          {
            businessId,
            branchId: (sale.branch_id as string | null) ?? null,
            saleId,
            bookingId: null,
          },
          sale.cancelled_at
            ? null
            : {
                items: items.map((item) => ({
                  name: String(item.name),
                  kind: 'goods' as const,
                  quantity: toNumber(item.quantity),
                  price: toNumber(item.price),
                })),
                method: String(sale.payment_method),
              },
        )
      })
      this.sendSoon(ids)
    })
  }

  /** After visits are marked, re-marked or reopened: what was paid in money gets its receipt. */
  async syncVisits(businessId: string, bookingIds: string[]) {
    for (const bookingId of bookingIds) {
      await this.safely(`visit ${bookingId}`, async () => {
        const ids = await this.dataSource.transaction(async (manager) => {
          const [visit] = this.rows(
            await manager.query(
              `SELECT b."branch_id", b."outcome", b."paid_amount", b."payment_method",
                 b."status", s."name" AS "service_name"
               FROM "bookings" b JOIN "services" s ON s."id" = b."service_id"
               WHERE b."id" = $1 AND b."business_id" = $2`,
              [bookingId, businessId],
            ),
          )
          if (!visit) return []
          const wanted =
            visit.status === 'confirmed'
              ? visitReceiptItems({
                  outcome: (visit.outcome as 'arrived' | 'no_show' | null) ?? null,
                  paidAmount: visit.paid_amount === null ? null : toNumber(visit.paid_amount),
                  paymentMethod: (visit.payment_method as string | null) ?? null,
                  serviceName: String(visit.service_name),
                })
              : null
          return this.reconcile(
            manager,
            {
              businessId,
              branchId: (visit.branch_id as string | null) ?? null,
              saleId: null,
              bookingId,
            },
            wanted,
          )
        })
        this.sendSoon(ids)
      })
    }
  }

  /** The latest receipt of each sale: its refund once there is one. */
  async latestForSales(saleIds: string[]) {
    if (saleIds.length === 0) return new Map<string, FiscalReceipt>()
    const rows = await this.query(
      `SELECT DISTINCT ON (r."sale_id") ${this.receiptColumns()}
       FROM ${this.receiptFrom()}
       WHERE r."sale_id" = ANY($1::uuid[]) AND r."status" <> 'cancelled'
       ORDER BY r."sale_id", r."created_at" DESC`,
      [saleIds],
    )
    return new Map(rows.map((row) => [String(row.sale_id), this.toReceipt(row)]))
  }

  /** A visit's receipts, newest first (the inspector shows the latest). */
  async listForBooking(businessId: string, bookingId: string) {
    const rows = await this.query(
      `SELECT ${this.receiptColumns()} FROM ${this.receiptFrom()}
       WHERE r."business_id" = $1 AND r."booking_id" = $2 AND r."sale_id" IS NULL
         AND r."status" <> 'cancelled'
       ORDER BY r."created_at" DESC LIMIT 20`,
      [businessId, bookingId],
    )
    return rows.map((row) => this.toReceipt(row))
  }

  /** Receipts the provider kept refusing, newest first. */
  async listFailed(businessId: string) {
    const rows = await this.query(
      `SELECT ${this.receiptColumns()} FROM ${this.receiptFrom()}
       WHERE r."business_id" = $1 AND r."status" = 'failed'
       ORDER BY r."created_at" DESC LIMIT 100`,
      [businessId],
    )
    return rows.map((row) => this.toReceipt(row))
  }

  /** The owner sends a receipt the provider kept refusing once more. */
  async retry(businessId: string, receiptId: string) {
    const [row] = this.rows(
      await this.dataSource.query(
        `UPDATE "fiscal_receipts" SET "status" = 'pending', "attempts" = 0, "next_attempt_at" = now()
         WHERE "id" = $1 AND "business_id" = $2 AND "status" = 'failed' RETURNING "id"`,
        [receiptId, businessId],
      ),
    )
    if (row) await this.send(receiptId)
    return this.findReceipt(receiptId, businessId)
  }

  /** The client's own link (`/receipt/<id>?s=`), no sign-in. */
  async publicReceipt(receiptId: string, signature: string) {
    if (!isReceiptSignature(receiptId, signature, this.authSecret)) {
      throw new NotFoundException('Чек не найден')
    }
    return this.findReceipt(receiptId)
  }

  /** Everything due: new receipts the first send missed and retries whose time has come. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendDue() {
    if (!this.driver) return
    const due = await this.query(
      `SELECT "id" FROM "fiscal_receipts"
       WHERE "status" IN ('pending', 'sending') AND "next_attempt_at" <= now()
       ORDER BY "next_attempt_at" LIMIT ${BATCH}`,
      [],
    )
    for (const row of due) await this.send(String(row.id))
  }

  /** One receipt to the provider; the queue keeps it until the provider says yes. */
  async send(receiptId: string) {
    if (!this.driver) return
    const [receipt] = this.rows(
      await this.dataSource.query(
        `UPDATE "fiscal_receipts" SET "status" = 'sending', "attempts" = "attempts" + 1,
           "next_attempt_at" = now() + interval '${SENDING_TIMEOUT_MINUTES} minutes'
         WHERE "id" = $1 AND "status" IN ('pending', 'sending') AND "next_attempt_at" <= now()
         RETURNING *`,
        [receiptId],
      ),
    )
    if (!receipt) return
    const attempts = toNumber(receipt.attempts)
    try {
      const original = receipt.refund_of
        ? await this.originalOf(receiptId, String(receipt.refund_of), attempts)
        : null
      if (original === 'wait' || original === 'dropped') return
      const settings = await this.loadSettings(this.dataSource.manager, String(receipt.business_id))
      const password = settings.secret ? open(settings.secret, this.authSecret) : null
      const result = await this.driver.issue({
        receiptId,
        kind: receipt.kind === 'refund' ? 'refund' : 'sale',
        original,
        inn: (receipt.inn as string | null) ?? null,
        document: this.toDocument(receipt),
        credentials: settings.login && password ? { login: settings.login, password } : null,
      })
      await this.dataSource.query(
        `UPDATE "fiscal_receipts" SET "status" = 'issued', "fiscal_number" = $2, "fiscal_sign" = $3,
           "provider_url" = $4, "issued_at" = now(), "last_error" = NULL
         WHERE "id" = $1`,
        [receiptId, result.fiscalNumber, result.fiscalSign, result.providerUrl],
      )
    } catch (error) {
      const message =
        error instanceof FiscalSendError
          ? error.message
          : `Касса не ответила: ${error instanceof Error ? error.message : String(error)}`
      const isOver = hasGivenUp(attempts)
      await this.dataSource.query(
        `UPDATE "fiscal_receipts" SET "status" = $2, "last_error" = $3,
           "next_attempt_at" = now() + ($4::int * interval '1 millisecond')
         WHERE "id" = $1`,
        [
          receiptId,
          isOver ? 'failed' : 'pending',
          message.slice(0, 300),
          nextAttemptDelayMs(attempts),
        ],
      )
      if (!(error instanceof FiscalSendError)) this.logger.warn(`receipt ${receiptId}: ${message}`)
    }
  }

  /**
   * Brings the receipts of one sale or visit in line with what was paid: drops ones not sent,
   * refunds sent ones, issues a new one. Returns the receipts to send now.
   */
  private async reconcile(
    manager: EntityManager,
    source: Source,
    wanted: { items: Parameters<typeof buildReceipt>[0]; method: string } | null,
  ) {
    const owner = source.saleId
      ? { column: 'sale_id', id: source.saleId, extra: '' }
      : { column: 'booking_id', id: source.bookingId, extra: 'AND "sale_id" IS NULL' }
    const [active] = this.rows(
      await manager.query(
        `SELECT "id", "status", "total", "payment" FROM "fiscal_receipts"
         WHERE "${owner.column}" = $1 ${owner.extra} AND "kind" = 'sale' AND NOT "is_refunded"
           AND "status" IN ${LIVE}
         FOR UPDATE`,
        [owner.id],
      ),
    )
    const settings = await this.loadSettings(manager, source.businessId)
    // Receipts are a paid-plan feature: back on the free plan nothing new is issued, while
    // receipts already issued are still refunded or corrected.
    const isIssuing =
      Boolean(this.driver) &&
      settings.isEnabled &&
      (await this.billing.hasFeature(source.businessId, 'fiscal'))
    if (!active && !isIssuing) return []
    const document = wanted ? buildReceipt(wanted.items, wanted.method, settings) : null
    const plan = planReceipts(
      active
        ? ({
            id: String(active.id),
            status: active.status,
            total: toNumber(active.total),
            payment: active.payment,
          } as ActiveReceipt)
        : null,
      document,
    )
    const toSend: string[] = []
    const refund = [...plan.refund]
    if (plan.cancel.length > 0) {
      const dropped = this.rows(
        await manager.query(
          `UPDATE "fiscal_receipts" SET "status" = 'cancelled'
           WHERE "id" = ANY($1::uuid[]) AND "status" IN ('pending', 'failed') RETURNING "id"`,
          [plan.cancel],
        ),
      ).map((row) => String(row.id))
      // One that went out to the provider in the meantime is refunded instead.
      refund.push(...plan.cancel.filter((id) => !dropped.includes(id)))
    }
    for (const id of refund) {
      const [row] = this.rows(
        await manager.query(
          `WITH original AS (
             UPDATE "fiscal_receipts" SET "is_refunded" = true WHERE "id" = $1 RETURNING *
           )
           INSERT INTO "fiscal_receipts" ("business_id", "branch_id", "kind", "sale_id", "booking_id",
             "refund_of", "driver", "inn", "tax_regime", "payment", "lines", "total", "vat_amount",
             "sales_tax_amount")
           SELECT "business_id", "branch_id", 'refund', "sale_id", "booking_id", "id", "driver",
             "inn", "tax_regime", "payment", "lines", "total", "vat_amount", "sales_tax_amount"
           FROM original RETURNING "id"`,
          [id],
        ),
      )
      if (row) toSend.push(String(row.id))
    }
    if (plan.issue && isIssuing && document) {
      const [row] = this.rows(
        await manager.query(
          `INSERT INTO "fiscal_receipts" ("business_id", "branch_id", "kind", "sale_id", "booking_id",
             "driver", "inn", "tax_regime", "payment", "lines", "total", "vat_amount",
             "sales_tax_amount")
           VALUES ($1, $2, 'sale', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT DO NOTHING RETURNING "id"`,
          [
            source.businessId,
            source.branchId,
            source.saleId,
            source.bookingId,
            this.driverName,
            settings.inn,
            settings.taxRegime,
            document.payment,
            JSON.stringify(document.lines),
            document.total,
            document.vatAmount,
            document.salesTaxAmount,
          ],
        ),
      )
      if (row) toSend.push(String(row.id))
    }
    return toSend
  }

  /** A refund goes out only after its original was issued; one never issued needs no refund. */
  private async originalOf(refundId: string, originalId: string, attempts: number) {
    const [original] = await this.query(
      'SELECT "status", "fiscal_number", "fiscal_sign" FROM "fiscal_receipts" WHERE "id" = $1',
      [originalId],
    )
    if (original?.status === 'issued') {
      return {
        fiscalNumber: String(original.fiscal_number),
        fiscalSign: (original.fiscal_sign as string | null) ?? null,
      }
    }
    if (original?.status === 'pending' || original?.status === 'sending') {
      await this.dataSource.query(
        `UPDATE "fiscal_receipts" SET "status" = 'pending', "attempts" = $2,
           "next_attempt_at" = now() + interval '1 minute' WHERE "id" = $1`,
        [refundId, Math.max(attempts - 1, 0)],
      )
      return 'wait' as const
    }
    await this.dataSource.query(
      `UPDATE "fiscal_receipts" SET "status" = 'cancelled' WHERE "id" = $1`,
      [refundId],
    )
    return 'dropped' as const
  }

  private sendSoon(ids: string[]) {
    for (const id of ids) {
      setImmediate(() => {
        this.send(id).catch((error) => this.logger.warn(`receipt ${id}: ${String(error)}`))
      })
    }
  }

  private async safely(what: string, run: () => Promise<void>) {
    try {
      await run()
    } catch (error) {
      this.logger.error(
        `receipts for ${what}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async findReceipt(receiptId: string, businessId?: string) {
    const [row] = await this.query(
      `SELECT ${this.receiptColumns()} FROM ${this.receiptFrom()}
       WHERE r."id" = $1 AND ($2::uuid IS NULL OR r."business_id" = $2)`,
      [receiptId, businessId ?? null],
    )
    if (!row) throw new NotFoundException('Чек не найден')
    return this.toReceipt(row)
  }

  private async loadSettings(manager: EntityManager, businessId: string): Promise<Settings> {
    const [row] = this.rows(
      await manager.query('SELECT * FROM "fiscal_settings" WHERE "business_id" = $1', [businessId]),
    )
    return {
      isEnabled: Boolean(row?.is_enabled),
      inn: (row?.inn as string | null) ?? null,
      taxRegime: ((row?.tax_regime as TaxRegime | undefined) ?? 'general') as TaxRegime,
      isVatPayer: Boolean(row?.is_vat_payer),
      vatRate: row ? toNumber(row.vat_rate) : 12,
      salesTaxServices: row ? toNumber(row.sales_tax_services) : 3,
      salesTaxGoods: row ? toNumber(row.sales_tax_goods) : 2,
      login: (row?.provider_login as string | null) ?? null,
      secret: (row?.provider_secret as string | null) ?? null,
    }
  }

  private receiptColumns() {
    return `r.*, b."name" AS "business_name", br."address" AS "branch_address"`
  }

  private receiptFrom() {
    return `"fiscal_receipts" r JOIN "businesses" b ON b."id" = r."business_id"
       LEFT JOIN "branches" br ON br."id" = r."branch_id"`
  }

  private toDocument(row: Row): FiscalDocument {
    return {
      lines: row.lines as FiscalDocument['lines'],
      total: toNumber(row.total),
      vatAmount: toNumber(row.vat_amount),
      salesTaxAmount: toNumber(row.sales_tax_amount),
      payment: row.payment === 'cash' ? 'cash' : 'cashless',
    }
  }

  private toReceipt(row: Row): FiscalReceipt {
    const id = String(row.id)
    const web = this.config.get('PUBLIC_WEB_URL', { infer: true })
    return {
      id,
      kind: row.kind === 'refund' ? 'refund' : 'sale',
      status: row.status as FiscalReceipt['status'],
      bookingId: (row.booking_id as string | null) ?? null,
      saleId: (row.sale_id as string | null) ?? null,
      refundOf: (row.refund_of as string | null) ?? null,
      isRefunded: Boolean(row.is_refunded),
      businessName: String(row.business_name),
      address: (row.branch_address as string | null) ?? null,
      inn: (row.inn as string | null) ?? null,
      taxRegime: row.tax_regime as TaxRegime,
      ...this.toDocument(row),
      fiscalNumber: (row.fiscal_number as string | null) ?? null,
      fiscalSign: (row.fiscal_sign as string | null) ?? null,
      providerUrl: (row.provider_url as string | null) ?? null,
      viewUrl: `${web}/receipt/${id}?s=${receiptSignature(id, this.authSecret)}`,
      isTest: row.driver === 'log',
      error: (row.last_error as string | null) ?? null,
      issuedAt: row.issued_at ? toIso(row.issued_at) : null,
      createdAt: toIso(row.created_at),
    }
  }

  private get authSecret() {
    return this.config.get('AUTH_SECRET', { infer: true })
  }

  // DELETE/UPDATE … RETURNING come back as [rows, affected] from TypeORM on Postgres.
  private rows(result: unknown) {
    return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result) as Row[]
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
