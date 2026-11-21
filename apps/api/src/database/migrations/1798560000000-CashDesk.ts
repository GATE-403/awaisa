import type { MigrationInterface, QueryRunner } from 'typeorm'

// Money at the counter, without fiscal receipts: products sold from the stock, cash shifts per
// branch with cash in and out, and the business's expenses, so analytics can show the profit.
export class CashDesk1798560000000 implements MigrationInterface {
  name = 'CashDesk1798560000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A stock item may also be sold to clients (shampoo, wax), at its own price.
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD "is_for_sale" boolean NOT NULL DEFAULT false,
         ADD "sale_price" numeric(12, 2) CHECK ("sale_price" >= 0)`,
    )

    // A shift of one branch's till: what was counted at the start and at the end.
    await queryRunner.query(`
      CREATE TABLE "cash_shifts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "opened_at" timestamptz NOT NULL DEFAULT now(),
        "opened_by" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "opening_cash" numeric(12, 2) NOT NULL CHECK ("opening_cash" >= 0),
        "closed_at" timestamptz,
        "closed_by" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "counted_cash" numeric(12, 2) CHECK ("counted_cash" >= 0),
        "expected_cash" numeric(12, 2),
        "note" varchar(240)
      )
    `)
    // One open shift per branch at a time.
    await queryRunner.query(
      'CREATE UNIQUE INDEX "cash_shifts_open" ON "cash_shifts" ("branch_id") WHERE "closed_at" IS NULL',
    )
    await queryRunner.query(
      'CREATE INDEX "cash_shifts_business" ON "cash_shifts" ("business_id", "opened_at")',
    )
    await queryRunner.query('CREATE INDEX "cash_shifts_opened_by" ON "cash_shifts" ("opened_by")')
    await queryRunner.query('CREATE INDEX "cash_shifts_closed_by" ON "cash_shifts" ("closed_by")')

    // Cash put into the till or taken out during a shift, with why.
    await queryRunner.query(`
      CREATE TABLE "cash_movements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "shift_id" uuid NOT NULL REFERENCES "cash_shifts"("id") ON DELETE CASCADE,
        "kind" varchar(4) NOT NULL CHECK ("kind" IN ('in', 'out')),
        "amount" numeric(12, 2) NOT NULL CHECK ("amount" > 0),
        "reason" varchar(160) NOT NULL,
        "created_by" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query('CREATE INDEX "cash_movements_shift" ON "cash_movements" ("shift_id")')
    await queryRunner.query(
      'CREATE INDEX "cash_movements_created_by" ON "cash_movements" ("created_by")',
    )

    // A sale of products, with a visit or on its own; who sold it is kept for a commission later.
    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "shift_id" uuid REFERENCES "cash_shifts"("id") ON DELETE SET NULL,
        "customer_phone" varchar(16),
        "customer_name" varchar(120),
        "seller_specialist_id" varchar(64) REFERENCES "specialists"("id") ON DELETE SET NULL,
        "created_by" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "payment_method" varchar(10) NOT NULL CHECK ("payment_method" IN ('cash', 'card', 'transfer')),
        "total" numeric(12, 2) NOT NULL CHECK ("total" >= 0),
        "cost" numeric(12, 2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "cancelled_at" timestamptz
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "sales_business" ON "sales" ("business_id", "created_at")',
    )
    await queryRunner.query('CREATE INDEX "sales_branch" ON "sales" ("branch_id")')
    await queryRunner.query('CREATE INDEX "sales_booking" ON "sales" ("booking_id")')
    await queryRunner.query('CREATE INDEX "sales_shift" ON "sales" ("shift_id")')
    await queryRunner.query('CREATE INDEX "sales_seller" ON "sales" ("seller_specialist_id")')
    await queryRunner.query('CREATE INDEX "sales_created_by" ON "sales" ("created_by")')

    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
        "item_id" uuid REFERENCES "stock_items"("id") ON DELETE SET NULL,
        "name" varchar(120) NOT NULL,
        "quantity" numeric(12, 2) NOT NULL CHECK ("quantity" > 0),
        "price" numeric(12, 2) NOT NULL CHECK ("price" >= 0),
        "unit_cost" numeric(12, 2) NOT NULL DEFAULT 0
      )
    `)
    await queryRunner.query('CREATE INDEX "sale_items_sale" ON "sale_items" ("sale_id")')
    await queryRunner.query('CREATE INDEX "sale_items_item" ON "sale_items" ("item_id")')

    // A sale takes the products off the shelf; undoing it puts them back.
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_kind_check"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_kind_check"
         CHECK ("kind" IN ('receive', 'use', 'adjust', 'sale'))`,
    )
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD "sale_id" uuid REFERENCES "sales"("id") ON DELETE CASCADE`,
    )
    await queryRunner.query('CREATE INDEX "stock_movements_sale" ON "stock_movements" ("sale_id")')

    // What the business spends: rent, purchases, salaries. Category is a preset key or the
    // owner's own word.
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
        "category" varchar(40) NOT NULL,
        "amount" numeric(12, 2) NOT NULL CHECK ("amount" > 0),
        "date" date NOT NULL,
        "note" varchar(240),
        "stock_movement_id" uuid REFERENCES "stock_movements"("id") ON DELETE SET NULL,
        "created_by" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "expenses_business" ON "expenses" ("business_id", "date")',
    )
    await queryRunner.query('CREATE INDEX "expenses_branch" ON "expenses" ("branch_id")')
    await queryRunner.query(
      'CREATE INDEX "expenses_stock_movement" ON "expenses" ("stock_movement_id")',
    )
    await queryRunner.query('CREATE INDEX "expenses_created_by" ON "expenses" ("created_by")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "expenses"')
    await queryRunner.query('DELETE FROM "stock_movements" WHERE "kind" = \'sale\'')
    await queryRunner.query('ALTER TABLE "stock_movements" DROP COLUMN "sale_id"')
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_kind_check"`,
    )
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_kind_check"
         CHECK ("kind" IN ('receive', 'use', 'adjust'))`,
    )
    await queryRunner.query('DROP TABLE "sale_items"')
    await queryRunner.query('DROP TABLE "sales"')
    await queryRunner.query('DROP TABLE "cash_movements"')
    await queryRunner.query('DROP TABLE "cash_shifts"')
    await queryRunner.query(
      'ALTER TABLE "stock_items" DROP COLUMN "sale_price", DROP COLUMN "is_for_sale"',
    )
  }
}
