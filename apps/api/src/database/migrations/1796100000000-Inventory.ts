import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Inventory1796100000000 implements MigrationInterface {
  name = 'Inventory1796100000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Consumables on the shelf: paint, shampoo, gloves — in their own units, with a unit cost.
    await queryRunner.query(`
      CREATE TABLE "stock_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "unit" varchar(12) NOT NULL,
        "quantity" numeric(12, 2) NOT NULL DEFAULT 0,
        "unit_cost" numeric(12, 2) NOT NULL DEFAULT 0 CHECK ("unit_cost" >= 0),
        "min_quantity" numeric(12, 2),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    // How much of an item one visit of a service uses.
    await queryRunner.query(`
      CREATE TABLE "service_materials" (
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "item_id" uuid NOT NULL REFERENCES "stock_items"("id") ON DELETE CASCADE,
        "amount" numeric(10, 2) NOT NULL CHECK ("amount" > 0),
        PRIMARY KEY ("service_id", "item_id")
      )
    `)
    // Every change of the stock: deliveries in, visits out (one per visit and item), corrections.
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "item_id" uuid NOT NULL REFERENCES "stock_items"("id") ON DELETE CASCADE,
        "delta" numeric(12, 2) NOT NULL,
        "kind" varchar(8) NOT NULL CHECK ("kind" IN ('receive', 'use', 'adjust')),
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE CASCADE,
        "cost" numeric(12, 2) NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "stock_movements_visit" ON "stock_movements" ("booking_id", "item_id") WHERE "kind" = 'use'`,
    )
    await queryRunner.query(
      'CREATE INDEX "stock_movements_business" ON "stock_movements" ("business_id", "created_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "stock_movements"')
    await queryRunner.query('DROP TABLE "service_materials"')
    await queryRunner.query('DROP TABLE "stock_items"')
  }
}
