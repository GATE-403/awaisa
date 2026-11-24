import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { visitLines } from '../bookings/visit-sql.js'
import { returnedRows, toNumber } from '../common/sql.js'
import type { StockItemInput } from './inventory.schemas.js'

type Row = Record<string, unknown>

/**
 * The shelf: items with a quantity and a unit cost. Services name what one visit uses; an
 * «arrived» visit writes off exactly that (once per visit and item) and the cost lands in
 * analytics. Undoing the visit puts it back.
 */
@Injectable()
export class InventoryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(businessId: string) {
    const items = await this.query(
      `SELECT i."id", i."name", i."unit", i."quantity", i."unit_cost" AS "unitCost",
         i."min_quantity" AS "minQuantity", i."is_for_sale" AS "isForSale",
         i."sale_price" AS "salePrice",
         COALESCE((SELECT json_agg(json_build_object('serviceId', m."service_id", 'amount', m."amount"))
           FROM "service_materials" m WHERE m."item_id" = i."id"), '[]') AS "materials"
       FROM "stock_items" i WHERE i."business_id" = $1 ORDER BY i."name"`,
      [businessId],
    )
    return items.map((row) => {
      const quantity = toNumber(row.quantity)
      const minQuantity = row.minQuantity === null ? null : toNumber(row.minQuantity)
      return {
        id: String(row.id),
        name: String(row.name),
        unit: String(row.unit),
        quantity,
        unitCost: toNumber(row.unitCost),
        minQuantity,
        isLow: minQuantity !== null && quantity <= minQuantity,
        isForSale: Boolean(row.isForSale),
        salePrice: row.salePrice === null ? null : toNumber(row.salePrice),
        materials: ((row.materials ?? []) as { serviceId: string; amount: number }[]).map(
          (item) => ({
            serviceId: item.serviceId,
            amount: toNumber(item.amount),
          }),
        ),
      }
    })
  }

  async create(businessId: string, input: StockItemInput) {
    const [item] = await this.query(
      `INSERT INTO "stock_items" ("business_id", "name", "unit", "unit_cost", "min_quantity",
         "is_for_sale", "sale_price")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "id"`,
      [
        businessId,
        input.name,
        input.unit,
        input.unitCost,
        input.minQuantity,
        input.isForSale,
        input.isForSale ? input.salePrice : null,
      ],
    )
    await this.setMaterials(businessId, String(item.id), input.materials)
    return this.list(businessId)
  }

  async update(businessId: string, id: string, input: StockItemInput) {
    const rows = await this.query(
      `UPDATE "stock_items" SET "name" = $3, "unit" = $4, "unit_cost" = $5, "min_quantity" = $6,
         "is_for_sale" = $7, "sale_price" = $8
       WHERE "id" = $1 AND "business_id" = $2 RETURNING "id"`,
      [
        id,
        businessId,
        input.name,
        input.unit,
        input.unitCost,
        input.minQuantity,
        input.isForSale,
        input.isForSale ? input.salePrice : null,
      ],
    )
    if (returnedRows(rows).length === 0) throw new NotFoundException('Позиция не найдена')
    await this.setMaterials(businessId, id, input.materials)
    return this.list(businessId)
  }

  async remove(businessId: string, id: string) {
    await this.query('DELETE FROM "stock_items" WHERE "id" = $1 AND "business_id" = $2', [
      id,
      businessId,
    ])
  }

  /**
   * A delivery: the quantity grows, the unit cost may change. With `expense` what it cost is
   * also recorded as an expense («Закупка материалов») in the same step.
   */
  async receive(
    businessId: string,
    id: string,
    quantity: number,
    unitCost?: number,
    expense?: { branchId: string | null; createdBy: string | null } | null,
  ) {
    const rows = await this.query(
      `UPDATE "stock_items" SET "quantity" = "quantity" + $3,
         "unit_cost" = COALESCE($4, "unit_cost")
       WHERE "id" = $1 AND "business_id" = $2 RETURNING "unit_cost", "name"`,
      [id, businessId, quantity, unitCost ?? null],
    )
    const [item] = returnedRows(rows)
    if (!item) throw new NotFoundException('Позиция не найдена')
    const cost = quantity * toNumber(item.unit_cost)
    const [movement] = await this.query(
      `INSERT INTO "stock_movements" ("business_id", "item_id", "delta", "kind", "cost")
       VALUES ($1, $2, $3, 'receive', $4) RETURNING "id"`,
      [businessId, id, quantity, cost],
    )
    if (expense && cost > 0) {
      await this.query(
        `INSERT INTO "expenses" ("business_id", "branch_id", "category", "amount", "date", "note",
           "stock_movement_id", "created_by")
         SELECT $1, (SELECT b."id" FROM "branches" b WHERE b."id" = $2 AND b."business_id" = $1),
           'materials', $3, (now() AT TIME ZONE 'UTC' + interval '6 hours')::date, $4, $5, $6`,
        [businessId, expense.branchId, cost, String(item.name), movement?.id, expense.createdBy],
      )
    }
    return this.list(businessId)
  }

  /** A stocktake: the counted quantity replaces the computed one. */
  async adjust(businessId: string, id: string, quantity: number) {
    const rows = await this.query(
      `WITH old AS (SELECT "quantity" FROM "stock_items" WHERE "id" = $1 AND "business_id" = $2)
       UPDATE "stock_items" SET "quantity" = $3 WHERE "id" = $1 AND "business_id" = $2
       RETURNING $3 - (SELECT "quantity" FROM old) AS "delta"`,
      [id, businessId, quantity],
    )
    const [moved] = returnedRows(rows)
    if (!moved) throw new NotFoundException('Позиция не найдена')
    if (toNumber(moved.delta) !== 0) {
      await this.query(
        `INSERT INTO "stock_movements" ("business_id", "item_id", "delta", "kind") VALUES ($1, $2, $3, 'adjust')`,
        [businessId, id, moved.delta],
      )
    }
    return this.list(businessId)
  }

  /** What one visit of each service uses of this item; only the business's own services. */
  private async setMaterials(
    businessId: string,
    id: string,
    materials: StockItemInput['materials'],
  ) {
    await this.query('DELETE FROM "service_materials" WHERE "item_id" = $1', [id])
    for (const material of materials.filter((entry) => entry.amount > 0)) {
      await this.query(
        `INSERT INTO "service_materials" ("service_id", "item_id", "amount")
         SELECT s."id", $2, $3 FROM "services" s WHERE s."id" = $1 AND s."business_id" = $4`,
        [material.serviceId, id, material.amount, businessId],
      )
    }
  }

  /**
   * Arrived visits write off their services' materials (every service of a visit of several),
   * once per visit and item: an item two services use goes out as one movement of both amounts.
   */
  async useForVisits(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    const used = await this.query(
      `INSERT INTO "stock_movements" ("business_id", "item_id", "delta", "kind", "booking_id", "cost")
       SELECT b."business_id", m."item_id", -SUM(m."amount"), 'use', b."id", SUM(m."amount") * i."unit_cost"
       FROM "bookings" b
       JOIN LATERAL ${visitLines('b')} l ON true
       JOIN "service_materials" m ON m."service_id" = l."service_id"
       JOIN "stock_items" i ON i."id" = m."item_id"
       WHERE b."id" = ANY($1) AND b."outcome" = 'arrived'
       GROUP BY b."id", b."business_id", m."item_id", i."unit_cost"
       ON CONFLICT ("booking_id", "item_id") WHERE "kind" = 'use' DO NOTHING
       RETURNING "item_id", "delta"`,
      [bookingIds],
    )
    for (const row of returnedRows(used)) {
      await this.query('UPDATE "stock_items" SET "quantity" = "quantity" + $2 WHERE "id" = $1', [
        row.item_id,
        row.delta,
      ])
    }
  }

  /** The visit is not «arrived» any more: what it used goes back on the shelf. */
  async revertVisits(bookingIds: string[]) {
    if (bookingIds.length === 0) return
    const removed = await this.query(
      `DELETE FROM "stock_movements" WHERE "booking_id" = ANY($1) AND "kind" = 'use'
       RETURNING "item_id", "delta"`,
      [bookingIds],
    )
    for (const row of returnedRows(removed)) {
      await this.query('UPDATE "stock_items" SET "quantity" = "quantity" - $2 WHERE "id" = $1', [
        row.item_id,
        row.delta,
      ])
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
