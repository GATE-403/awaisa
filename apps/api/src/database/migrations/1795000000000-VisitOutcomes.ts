import type { MigrationInterface, QueryRunner } from 'typeorm'

export class VisitOutcomes1795000000000 implements MigrationInterface {
  name = 'VisitOutcomes1795000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // What actually happened: the client came (and paid how much, how) or did not show up.
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN "outcome" varchar(16) CHECK ("outcome" IN ('arrived', 'no_show')),
        ADD COLUMN "paid_amount" int CHECK ("paid_amount" >= 0),
        ADD COLUMN "payment_method" varchar(16) CHECK ("payment_method" IN ('cash', 'card', 'transfer')),
        ADD COLUMN "outcome_at" timestamptz
    `)
    // The business's own notes on a client, keyed by phone (clients have no account per business).
    await queryRunner.query(`
      CREATE TABLE "client_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "phone" varchar(32) NOT NULL,
        "note" text NOT NULL DEFAULT '',
        "birthday" date,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("business_id", "phone")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "client_records"')
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP COLUMN "outcome_at", DROP COLUMN "payment_method",
        DROP COLUMN "paid_amount", DROP COLUMN "outcome"
    `)
  }
}
