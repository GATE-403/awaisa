import type {
  CashDesk,
  CashMovement,
  CashShift,
  Sale,
  SalePaymentMethod,
  StockItem,
} from '@awaisa/contracts'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { addDays, businessDateTimeToUtc, toBusinessParts } from '../common/business-time.js'
import { normalizePhone } from '../common/phone.js'
import { returnedRows, toNumber } from '../common/sql.js'
import { FiscalService } from '../fiscal/fiscal.service.js'
import { InventoryService } from '../inventory/inventory.service.js'
import {
  cashDifference,
  expectedCash,
  roundMoney,
  saleCost,
  saleTotal,
  shortages,
  stockDeltas,
} from './cash-math.js'
import type {
  CashMovementBody,
  CloseShiftBody,
  OpenShiftBody,
  SaleBody,
} from './cashdesk.schemas.js'

type Row = Record<string, unknown>

const CLOSED_SHIFTS = 10
const UNIQUE_VIOLATION = '23505'

const toIso = (value: unknown) =>
  (value instanceof Date ? value : new Date(String(value))).toISOString()
const toNullableNumber = (value: unknown) =>
  value === null || value === undefined ? null : toNumber(value)

/**
 * The counter: shifts of a branch's till, cash put in and taken out, and products sold with a
 * visit or on their own. A sale gets its fiscal receipt and a cancelled one its refund through
 * the fiscal queue, after the sale is saved (`FiscalService`). A business that never opens a
 * shift sells and marks visits as before; sales then belong to no shift.
 */
@Injectable()
export class CashDeskService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventory: InventoryService,
    private readonly fiscal: FiscalService,
  ) {}

  async desk(businessId: string): Promise<CashDesk> {
    const today = toBusinessParts(new Date()).dateKey
    const [shifts, sales, stock] = await Promise.all([
      this.query(
        `(SELECT * FROM "cash_shifts" WHERE "business_id" = $1 AND "closed_at" IS NULL)
         UNION ALL
         (SELECT * FROM "cash_shifts" WHERE "business_id" = $1 AND "closed_at" IS NOT NULL
           ORDER BY "closed_at" DESC LIMIT ${CLOSED_SHIFTS})`,
        [businessId],
      ),
      this.listSales(businessId, {
        from: businessDateTimeToUtc(today, 0),
        to: businessDateTimeToUtc(addDays(today, 1), 0),
      }),
      this.inventory.list(businessId),
    ])
    const views = await Promise.all(shifts.map((row) => this.toShift(row)))
    return {
      open: views.filter((shift) => shift.closedAt === null),
      closed: views.filter((shift) => shift.closedAt !== null),
      sales,
      products: stock.filter((item: StockItem) => item.isForSale),
    }
  }

  async openShift(businessId: string, customerId: string | null, input: OpenShiftBody) {
    const [branch] = await this.query(
      'SELECT 1 FROM "branches" WHERE "id" = $1 AND "business_id" = $2',
      [input.branchId, businessId],
    )
    if (!branch) throw new NotFoundException('Филиал не найден')
    try {
      const [row] = await this.query(
        `INSERT INTO "cash_shifts" ("business_id", "branch_id", "opened_by", "opening_cash")
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [businessId, input.branchId, customerId, input.openingCash],
      )
      return this.toShift(row as Row)
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('В этом филиале смена уже открыта')
      }
      throw error
    }
  }

  async addMovement(
    businessId: string,
    shiftId: string,
    customerId: string | null,
    input: CashMovementBody,
  ) {
    const shift = await this.findShift(businessId, shiftId)
    if (shift.closed_at) throw new BadRequestException('Смена уже закрыта')
    await this.query(
      `INSERT INTO "cash_movements" ("shift_id", "kind", "amount", "reason", "created_by")
       VALUES ($1, $2, $3, $4, $5)`,
      [shiftId, input.kind, input.amount, input.reason, customerId],
    )
    return this.toShift(shift)
  }

  /** Closing keeps what was expected then, so later edits of visits do not rewrite history. */
  async closeShift(
    businessId: string,
    shiftId: string,
    customerId: string | null,
    input: CloseShiftBody,
  ) {
    const shift = await this.findShift(businessId, shiftId)
    if (shift.closed_at) throw new BadRequestException('Смена уже закрыта')
    const now = new Date()
    const view = await this.toShift(shift, now)
    const [row] = await this.query(
      `UPDATE "cash_shifts" SET "closed_at" = $3, "closed_by" = $4, "counted_cash" = $5,
         "expected_cash" = $6, "note" = $7
       WHERE "id" = $1 AND "business_id" = $2 AND "closed_at" IS NULL RETURNING *`,
      [
        shiftId,
        businessId,
        now,
        customerId,
        input.countedCash,
        view.expectedCash,
        input.note ?? null,
      ],
    ).then((result) => returnedRows(result))
    if (!row) throw new BadRequestException('Смена уже закрыта')
    return this.toShift(row)
  }

  async listSales(
    businessId: string,
    where: { bookingId?: string; from?: Date; to?: Date },
  ): Promise<Sale[]> {
    const rows = await this.query(
      `SELECT s.*, sp."name" AS "seller_name",
         COALESCE((SELECT json_agg(json_build_object('itemId', i."item_id", 'name', i."name",
             'quantity', i."quantity", 'price', i."price") ORDER BY i."name")
           FROM "sale_items" i WHERE i."sale_id" = s."id"), '[]') AS "items"
       FROM "sales" s LEFT JOIN "specialists" sp ON sp."id" = s."seller_specialist_id"
       WHERE s."business_id" = $1
         AND ($2::uuid IS NULL OR s."booking_id" = $2)
         AND ($3::timestamptz IS NULL OR s."created_at" >= $3)
         AND ($4::timestamptz IS NULL OR s."created_at" < $4)
       ORDER BY s."created_at" DESC LIMIT 200`,
      [businessId, where.bookingId ?? null, where.from ?? null, where.to ?? null],
    )
    return this.withReceipts(rows.map((row) => this.toSale(row)))
  }

  /**
   * Sells products from the shelf: they go down at once (more than is there is refused), the
   * cost is kept at today's unit cost for the profit, and the sale lands in the branch's open
   * shift when there is one. With a visit, its branch, client and master come from the booking.
   */
  async createSale(businessId: string, customerId: string | null, input: SaleBody) {
    const saleId = await this.dataSource.transaction(async (manager) => {
      const booking = input.bookingId
        ? await this.findBooking(manager, businessId, input.bookingId)
        : null
      const branchId = await this.resolveBranch(
        manager,
        businessId,
        input.branchId ?? (booking?.branch_id as string | null) ?? null,
      )
      const itemIds = [...new Set(input.items.map((line) => line.itemId))]
      const products = returnedRows(
        await manager.query(
          `SELECT "id", "name", "quantity", "unit_cost", "sale_price" FROM "stock_items"
           WHERE "business_id" = $1 AND "id" = ANY($2) AND "is_for_sale" FOR UPDATE`,
          [businessId, itemIds],
        ),
      )
      if (products.length !== itemIds.length)
        throw new BadRequestException('Этот товар не продаётся')
      const stock = new Map(
        products.map((row) => [
          String(row.id),
          { name: String(row.name), quantity: toNumber(row.quantity) },
        ]),
      )
      const short = shortages(input.items, stock)
      if (short.length > 0)
        throw new BadRequestException(`Не хватает на складе: ${short.join(', ')}`)

      const byId = new Map(products.map((row) => [String(row.id), row]))
      const lines = input.items.map((line) => {
        const product = byId.get(line.itemId) as Row
        return {
          itemId: line.itemId,
          name: String(product.name),
          quantity: line.quantity,
          price: toNumber(product.sale_price),
          unitCost: toNumber(product.unit_cost),
        }
      })
      const phone = input.customerPhone
        ? normalizePhone(input.customerPhone)
        : ((booking?.customer_phone as string | null) ?? null)
      if (input.customerPhone && !phone) throw new BadRequestException('Проверьте номер клиента')
      const sellerId = await this.resolveSeller(
        manager,
        businessId,
        input.sellerId ?? (booking?.specialist_id as string | null) ?? null,
      )
      const [shift] = returnedRows(
        await manager.query(
          'SELECT "id" FROM "cash_shifts" WHERE "branch_id" = $1 AND "closed_at" IS NULL',
          [branchId],
        ),
      )
      const [sale] = returnedRows(
        await manager.query(
          `INSERT INTO "sales" ("business_id", "branch_id", "booking_id", "shift_id", "customer_phone",
             "customer_name", "seller_specialist_id", "created_by", "payment_method", "total", "cost")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING "id"`,
          [
            businessId,
            branchId,
            booking?.id ?? null,
            shift?.id ?? null,
            phone,
            input.customerName?.trim() || (booking?.customer_name as string | null) || null,
            sellerId,
            customerId,
            input.paymentMethod,
            saleTotal(lines),
            saleCost(lines),
          ],
        ),
      )
      const id = String(sale?.id)
      for (const line of lines) {
        await manager.query(
          `INSERT INTO "sale_items" ("sale_id", "item_id", "name", "quantity", "price", "unit_cost")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, line.itemId, line.name, line.quantity, line.price, line.unitCost],
        )
        await manager.query(
          `INSERT INTO "stock_movements" ("business_id", "item_id", "delta", "kind", "sale_id", "cost")
           VALUES ($1, $2, $3, 'sale', $4, $5)`,
          [businessId, line.itemId, -line.quantity, id, roundMoney(line.quantity * line.unitCost)],
        )
      }
      for (const [itemId, delta] of stockDeltas(lines, 'sell')) {
        await manager.query(
          'UPDATE "stock_items" SET "quantity" = "quantity" + $2 WHERE "id" = $1',
          [itemId, delta],
        )
      }
      return id
    })
    await this.fiscal.syncSale(businessId, saleId)
    return this.findSale(businessId, saleId)
  }

  /** Undo: the sale stays in the history as cancelled and its products go back on the shelf. */
  async cancelSale(businessId: string, saleId: string) {
    await this.dataSource.transaction(async (manager) => {
      const [sale] = returnedRows(
        await manager.query(
          `UPDATE "sales" SET "cancelled_at" = now()
           WHERE "id" = $1 AND "business_id" = $2 AND "cancelled_at" IS NULL RETURNING "id"`,
          [saleId, businessId],
        ),
      )
      if (!sale) {
        const [exists] = returnedRows(
          await manager.query('SELECT 1 FROM "sales" WHERE "id" = $1 AND "business_id" = $2', [
            saleId,
            businessId,
          ]),
        )
        if (!exists) throw new NotFoundException('Продажа не найдена')
        return
      }
      const removed = returnedRows(
        await manager.query(
          `DELETE FROM "stock_movements" WHERE "sale_id" = $1 AND "kind" = 'sale'
           RETURNING "item_id", "delta"`,
          [saleId],
        ),
      )
      const back = stockDeltas(
        removed.map((row) => ({ itemId: String(row.item_id), quantity: -toNumber(row.delta) })),
        'undo',
      )
      for (const [itemId, delta] of back) {
        await manager.query(
          'UPDATE "stock_items" SET "quantity" = "quantity" + $2 WHERE "id" = $1',
          [itemId, delta],
        )
      }
    })
    await this.fiscal.syncSale(businessId, saleId)
    return this.findSale(businessId, saleId)
  }

  private async findSale(businessId: string, saleId: string) {
    const [row] = await this.query(
      `SELECT s.*, sp."name" AS "seller_name",
         COALESCE((SELECT json_agg(json_build_object('itemId', i."item_id", 'name', i."name",
             'quantity', i."quantity", 'price', i."price") ORDER BY i."name")
           FROM "sale_items" i WHERE i."sale_id" = s."id"), '[]') AS "items"
       FROM "sales" s LEFT JOIN "specialists" sp ON sp."id" = s."seller_specialist_id"
       WHERE s."id" = $1 AND s."business_id" = $2`,
      [saleId, businessId],
    )
    if (!row) throw new NotFoundException('Продажа не найдена')
    const [sale] = await this.withReceipts([this.toSale(row)])
    return sale as Sale
  }

  private async withReceipts(sales: Sale[]) {
    const receipts = await this.fiscal.latestForSales(sales.map((sale) => sale.id))
    return sales.map((sale) => ({ ...sale, receipt: receipts.get(sale.id) ?? null }))
  }

  private async findShift(businessId: string, shiftId: string) {
    const [row] = await this.query(
      'SELECT * FROM "cash_shifts" WHERE "id" = $1 AND "business_id" = $2',
      [shiftId, businessId],
    )
    if (!row) throw new NotFoundException('Смена не найдена')
    return row
  }

  private async findBooking(manager: EntityManager, businessId: string, bookingId: string) {
    const [row] = returnedRows(
      await manager.query(
        `SELECT "id", "branch_id", "customer_phone", "customer_name", "specialist_id", "status"
         FROM "bookings" WHERE "id" = $1 AND "business_id" = $2`,
        [bookingId, businessId],
      ),
    )
    if (!row) throw new NotFoundException('Запись не найдена')
    if (row.status !== 'confirmed') throw new BadRequestException('Запись отменена')
    return row
  }

  /** The asked branch when it is the business's own, else its first one. */
  private async resolveBranch(manager: EntityManager, businessId: string, branchId: string | null) {
    const [row] = returnedRows(
      await manager.query(
        `SELECT "id" FROM "branches" WHERE "business_id" = $1
         ORDER BY ("id" = $2::uuid) DESC NULLS LAST, "position", "created_at" LIMIT 1`,
        [businessId, branchId],
      ),
    )
    if (!row) throw new BadRequestException('Добавьте филиал')
    if (branchId && row.id !== branchId) throw new NotFoundException('Филиал не найден')
    return String(row.id)
  }

  private async resolveSeller(manager: EntityManager, businessId: string, sellerId: string | null) {
    if (!sellerId) return null
    const [row] = returnedRows(
      await manager.query('SELECT "id" FROM "specialists" WHERE "id" = $1 AND "business_id" = $2', [
        sellerId,
        businessId,
      ]),
    )
    if (!row) throw new BadRequestException('Мастер не найден')
    return String(row.id)
  }

  /**
   * What the till of an open shift should hold now (or held at `until`): visits of the branch
   * marked paid in cash while the shift was open, cash sales of the shift and the cash moved.
   * Visits count by when they were marked, so two shifts of one day never count a visit twice.
   */
  private async toShift(row: Row, until?: Date): Promise<CashShift> {
    const id = String(row.id)
    const end = until ?? (row.closed_at ? new Date(String(toIso(row.closed_at))) : new Date())
    const [[money], movements] = await Promise.all([
      this.query(
        `SELECT
           (SELECT COALESCE(SUM(b."paid_amount"), 0) FROM "bookings" b
             WHERE b."branch_id" = $2 AND b."status" = 'confirmed' AND b."outcome" = 'arrived'
               AND b."payment_method" = 'cash' AND b."outcome_at" >= $3 AND b."outcome_at" <= $4
           ) AS "visitsCash",
           (SELECT COALESCE(SUM(s."total"), 0) FROM "sales" s
             WHERE s."shift_id" = $1 AND s."payment_method" = 'cash' AND s."cancelled_at" IS NULL
           ) AS "salesCash"`,
        [id, row.branch_id, row.opened_at, end],
      ),
      this.query(
        `SELECT "id", "kind", "amount", "reason", "created_at" FROM "cash_movements"
         WHERE "shift_id" = $1 ORDER BY "created_at"`,
        [id],
      ),
    ])
    const moves: CashMovement[] = movements.map((move) => ({
      id: String(move.id),
      kind: move.kind === 'out' ? 'out' : 'in',
      amount: toNumber(move.amount),
      reason: String(move.reason),
      createdAt: toIso(move.created_at),
    }))
    const cash = {
      openingCash: toNumber(row.opening_cash),
      visitsCash: toNumber(money?.visitsCash),
      salesCash: toNumber(money?.salesCash),
      cashIn: roundMoney(
        moves.filter((move) => move.kind === 'in').reduce((sum, move) => sum + move.amount, 0),
      ),
      cashOut: roundMoney(
        moves.filter((move) => move.kind === 'out').reduce((sum, move) => sum + move.amount, 0),
      ),
    }
    const isClosed = row.closed_at !== null && row.closed_at !== undefined
    // A closed shift shows what was expected at closing, kept with it.
    const expected =
      isClosed && row.expected_cash !== null ? toNumber(row.expected_cash) : expectedCash(cash)
    const counted = toNullableNumber(row.counted_cash)
    return {
      id,
      branchId: String(row.branch_id),
      openedAt: toIso(row.opened_at),
      openedBy: row.opened_by ? String(row.opened_by) : null,
      openingCash: cash.openingCash,
      closedAt: isClosed ? toIso(row.closed_at) : null,
      closedBy: row.closed_by ? String(row.closed_by) : null,
      countedCash: counted,
      note: row.note ? String(row.note) : null,
      visitsCash: cash.visitsCash,
      salesCash: cash.salesCash,
      cashIn: cash.cashIn,
      cashOut: cash.cashOut,
      expectedCash: expected,
      difference: counted === null ? null : cashDifference(counted, expected),
      movements: moves,
    }
  }

  private toSale(row: Row): Sale {
    return {
      id: String(row.id),
      createdAt: toIso(row.created_at),
      branchId: row.branch_id ? String(row.branch_id) : null,
      bookingId: row.booking_id ? String(row.booking_id) : null,
      customerPhone: row.customer_phone ? String(row.customer_phone) : null,
      customerName: row.customer_name ? String(row.customer_name) : null,
      sellerId: row.seller_specialist_id ? String(row.seller_specialist_id) : null,
      sellerName: row.seller_name ? String(row.seller_name) : null,
      paymentMethod: String(row.payment_method) as SalePaymentMethod,
      total: toNumber(row.total),
      items: ((row.items ?? []) as Row[]).map((item) => ({
        itemId: item.itemId ? String(item.itemId) : null,
        name: String(item.name),
        quantity: toNumber(item.quantity),
        price: toNumber(item.price),
      })),
      isCancelled: row.cancelled_at !== null && row.cancelled_at !== undefined,
      receipt: null,
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
