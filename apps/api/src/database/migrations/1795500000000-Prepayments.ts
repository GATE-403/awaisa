import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Prepayments1795500000000 implements MigrationInterface {
  name = 'Prepayments1795500000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A service may ask for a deposit (сом) when booked online.
    await queryRunner.query(
      'ALTER TABLE "services" ADD COLUMN "deposit" integer CHECK ("deposit" > 0)',
    )
    // A booking with a deposit holds its slot while the client pays; unpaid ones expire.
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN "deposit_amount" integer,
        ADD COLUMN "payment_status" varchar(16)
          CHECK ("payment_status" IN ('pending', 'paid', 'refunded', 'kept', 'expired')),
        ADD COLUMN "payment_due_at" timestamptz,
        ADD COLUMN "cancelled_by" varchar(8) CHECK ("cancelled_by" IN ('client', 'salon'))
    `)
    await queryRunner.query(
      `CREATE INDEX "bookings_payment_pending" ON "bookings" ("payment_due_at") WHERE "payment_status" = 'pending'`,
    )
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "provider" varchar(32) NOT NULL,
        "provider_ref" varchar(128),
        "status" varchar(16) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'succeeded', 'failed', 'refunded')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "paid_at" timestamptz,
        "refunded_at" timestamptz
      )
    `)
    await queryRunner.query('CREATE INDEX "payments_booking" ON "payments" ("booking_id")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "payments"')
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP COLUMN "deposit_amount", DROP COLUMN "payment_status",
        DROP COLUMN "payment_due_at", DROP COLUMN "cancelled_by"
    `)
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN "deposit"')
  }
}
