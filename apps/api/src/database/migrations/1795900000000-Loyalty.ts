import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Loyalty1795900000000 implements MigrationInterface {
  name = 'Loyalty1795900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Bonuses: a share of what the client paid comes back as points to spend on later visits.
    await queryRunner.query(
      'ALTER TABLE "businesses" ADD COLUMN "bonus_percent" smallint CHECK ("bonus_percent" BETWEEN 1 AND 30)',
    )
    await queryRunner.query(`
      CREATE TABLE "bonus_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "phone" varchar(32) NOT NULL,
        "amount" integer NOT NULL CHECK ("amount" <> 0),
        "kind" varchar(8) NOT NULL CHECK ("kind" IN ('earn', 'spend', 'manual')),
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE CASCADE,
        "note" varchar(120) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "bonus_transactions_phone" ON "bonus_transactions" ("business_id", "phone")',
    )
    await queryRunner.query(
      'CREATE UNIQUE INDEX "bonus_transactions_visit" ON "bonus_transactions" ("booking_id", "kind") WHERE "booking_id" IS NOT NULL',
    )

    // Gift certificates: a code with a balance, spent across visits.
    await queryRunner.query(`
      CREATE TABLE "gift_certificates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "code" varchar(12) NOT NULL,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "balance" integer NOT NULL CHECK ("balance" >= 0),
        "recipient" varchar(120) NOT NULL DEFAULT '',
        "phone" varchar(32),
        "expires_on" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("business_id", "code")
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "certificate_uses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "certificate_id" uuid NOT NULL REFERENCES "gift_certificates"("id") ON DELETE CASCADE,
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    // Subscriptions («5 стрижек за 4»): a plan the business sells, a client's copy with visits left.
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "title" varchar(80) NOT NULL,
        "service_id" varchar(64) REFERENCES "services"("id") ON DELETE SET NULL,
        "visits" smallint NOT NULL CHECK ("visits" BETWEEN 1 AND 100),
        "price" integer NOT NULL CHECK ("price" >= 0),
        "valid_days" smallint NOT NULL CHECK ("valid_days" BETWEEN 1 AND 730),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "client_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "plan_id" uuid REFERENCES "subscription_plans"("id") ON DELETE SET NULL,
        "phone" varchar(32) NOT NULL,
        "title" varchar(80) NOT NULL,
        "service_id" varchar(64) REFERENCES "services"("id") ON DELETE SET NULL,
        "visits_total" smallint NOT NULL,
        "visits_left" smallint NOT NULL CHECK ("visits_left" >= 0),
        "price_paid" integer NOT NULL,
        "expires_on" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "client_subscriptions_phone" ON "client_subscriptions" ("business_id", "phone")',
    )
    await queryRunner.query(`
      CREATE TABLE "subscription_uses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "subscription_id" uuid NOT NULL REFERENCES "client_subscriptions"("id") ON DELETE CASCADE,
        "booking_id" uuid NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    // A visit can now be paid by a subscription or a certificate as well.
    await queryRunner.query(
      'ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_payment_method_check"',
    )
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payment_method_check"
        CHECK ("payment_method" IN ('cash', 'card', 'transfer', 'subscription', 'certificate'))
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "subscription_uses"')
    await queryRunner.query('DROP TABLE "client_subscriptions"')
    await queryRunner.query('DROP TABLE "subscription_plans"')
    await queryRunner.query('DROP TABLE "certificate_uses"')
    await queryRunner.query('DROP TABLE "gift_certificates"')
    await queryRunner.query('DROP TABLE "bonus_transactions"')
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "bonus_percent"')
  }
}
