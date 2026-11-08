import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AccountsAndNotifications1794300000000 implements MigrationInterface {
  name = 'AccountsAndNotifications1794300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(16) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "otp_codes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "phone" varchar(16) NOT NULL,
        "code_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "attempts" int NOT NULL DEFAULT 0,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "otp_codes_phone_created_at_idx" ON "otp_codes" ("phone", "created_at")',
    )

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "time_off" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "reason" varchar(160) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("ends_at" > "starts_at")
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "time_off_specialist_starts_at_idx" ON "time_off" ("specialist_id", "starts_at")',
    )

    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        ADD COLUMN "reminder_sent_at" timestamptz
    `)

    // Phones were stored as typed; bring them to E.164 so a verified number finds its bookings.
    await queryRunner.query(`
      UPDATE "bookings" SET "customer_phone" = CASE
        WHEN length(d) = 9 THEN '+996' || d
        WHEN length(d) = 10 AND left(d, 1) = '0' THEN '+996' || substr(d, 2)
        ELSE '+' || d
      END
      FROM (SELECT "id" AS bid, regexp_replace("customer_phone", '\\D', '', 'g') AS d FROM "bookings") AS digits
      WHERE "bookings"."id" = digits.bid
    `)
    await queryRunner.query(
      'CREATE INDEX "bookings_customer_phone_idx" ON "bookings" ("customer_phone")',
    )
    await queryRunner.query('CREATE INDEX "bookings_customer_id_idx" ON "bookings" ("customer_id")')
    await queryRunner.query(`
      CREATE INDEX "bookings_pending_reminder_idx" ON "bookings" ("starts_at")
      WHERE "status" = 'confirmed' AND "reminder_sent_at" IS NULL
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "bookings_pending_reminder_idx"')
    await queryRunner.query('DROP INDEX "bookings_customer_id_idx"')
    await queryRunner.query('DROP INDEX "bookings_customer_phone_idx"')
    await queryRunner.query(
      'ALTER TABLE "bookings" DROP COLUMN "reminder_sent_at", DROP COLUMN "customer_id"',
    )
    await queryRunner.query('DROP TABLE "time_off"')
    await queryRunner.query('DROP TABLE "sessions"')
    await queryRunner.query('DROP TABLE "otp_codes"')
    await queryRunner.query('DROP TABLE "customers"')
  }
}
