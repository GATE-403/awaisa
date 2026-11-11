import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Waitlist1795400000000 implements MigrationInterface {
  name = 'Waitlist1795400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A client waits for a full day to free up: one SMS when a time opens, then it is done.
    await queryRunner.query(`
      CREATE TABLE "waitlist_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "specialist_id" varchar(64) REFERENCES "specialists"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
        "date" date NOT NULL,
        "customer_name" varchar(120) NOT NULL,
        "customer_phone" varchar(32) NOT NULL,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "token_hash" varchar(64) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'waiting'
          CHECK ("status" IN ('waiting', 'notified', 'cancelled', 'expired')),
        "notified_time" varchar(5),
        "notified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "waitlist_waiting" ON "waitlist_entries" ("date") WHERE "status" = 'waiting'`,
    )
    await queryRunner.query(
      'CREATE INDEX "waitlist_phone" ON "waitlist_entries" ("customer_phone")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "waitlist_entries"')
  }
}
