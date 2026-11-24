import type { Expense, ExpenseList } from '@awaisa/contracts'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { addDays, toBusinessParts } from '../common/business-time.js'
import { returnedRows, toNumber } from '../common/sql.js'
import { roundMoney } from './cash-math.js'
import type { ExpenseBody } from './cashdesk.schemas.js'

type Row = Record<string, unknown>

/** Categories offered first; anything else the owner types is kept as their own. */
const PRESET_CATEGORIES = ['rent', 'materials', 'salaries', 'utilities', 'marketing', 'other']

/** What the business spends, by category, day and branch: the other half of the profit. */
@Injectable()
export class ExpensesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(businessId: string, days: number): Promise<ExpenseList> {
    const today = toBusinessParts(new Date()).dateKey
    const from = addDays(today, -(days - 1))
    const [rows, custom] = await Promise.all([
      this.query(
        `SELECT "id", "category", "amount", to_char("date", 'YYYY-MM-DD') AS "date", "branch_id",
           "note", "stock_movement_id"
         FROM "expenses" WHERE "business_id" = $1 AND "date" >= $2 AND "date" <= $3
         ORDER BY "date" DESC, "created_at" DESC`,
        [businessId, from, today],
      ),
      this.query(
        `SELECT DISTINCT "category" FROM "expenses"
         WHERE "business_id" = $1 AND NOT ("category" = ANY($2)) ORDER BY "category"`,
        [businessId, PRESET_CATEGORIES],
      ),
    ])
    const items = rows.map((row) => this.toExpense(row))
    return {
      items,
      categories: custom.map((row) => String(row.category)),
      total: roundMoney(items.reduce((sum, item) => sum + item.amount, 0)),
    }
  }

  async create(businessId: string, customerId: string | null, input: ExpenseBody) {
    const [row] = await this.query(
      `INSERT INTO "expenses" ("business_id", "branch_id", "category", "amount", "date", "note", "created_by")
       SELECT $1, (SELECT b."id" FROM "branches" b WHERE b."id" = $2 AND b."business_id" = $1),
         $3, $4, $5, $6, $7
       RETURNING "id", "category", "amount", to_char("date", 'YYYY-MM-DD') AS "date", "branch_id",
         "note", "stock_movement_id"`,
      [
        businessId,
        input.branchId,
        input.category,
        input.amount,
        input.date,
        input.note || null,
        customerId,
      ],
    )
    return this.toExpense(row as Row)
  }

  async update(businessId: string, id: string, input: ExpenseBody) {
    const result = await this.query(
      `UPDATE "expenses" SET "category" = $3, "amount" = $4, "date" = $5, "note" = $6,
         "branch_id" = (SELECT b."id" FROM "branches" b WHERE b."id" = $7 AND b."business_id" = $2)
       WHERE "id" = $1 AND "business_id" = $2
       RETURNING "id", "category", "amount", to_char("date", 'YYYY-MM-DD') AS "date", "branch_id",
         "note", "stock_movement_id"`,
      [
        id,
        businessId,
        input.category,
        input.amount,
        input.date,
        input.note || null,
        input.branchId,
      ],
    )
    const [row] = returnedRows(result)
    if (!row) throw new NotFoundException('Expense not found')
    return this.toExpense(row)
  }

  async remove(businessId: string, id: string) {
    await this.query('DELETE FROM "expenses" WHERE "id" = $1 AND "business_id" = $2', [
      id,
      businessId,
    ])
  }

  private toExpense(row: Row): Expense {
    return {
      id: String(row.id),
      category: String(row.category),
      amount: toNumber(row.amount),
      date: String(row.date),
      branchId: row.branch_id ? String(row.branch_id) : null,
      note: row.note ? String(row.note) : null,
      isFromStock: Boolean(row.stock_movement_id),
    }
  }

  private query(sql: string, params: unknown[]) {
    return this.dataSource.query(sql, params) as Promise<Row[]>
  }
}
