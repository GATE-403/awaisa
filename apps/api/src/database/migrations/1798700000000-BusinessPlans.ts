import type { MigrationInterface, QueryRunner } from 'typeorm'

// Plans for businesses: the plans and SMS packs are rows (prices change without a release), every
// business has one subscription row, orders are paid through `payments` (kind 'billing').
// Businesses that exist today keep everything for good on the hidden «Основатель» plan.
export class BusinessPlans1798700000000 implements MigrationInterface {
  name = 'BusinessPlans1798700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "key" varchar(32) PRIMARY KEY,
        "title" varchar(60) NOT NULL,
        "description" varchar(200) NOT NULL DEFAULT '',
        "monthly_price" integer NOT NULL DEFAULT 0 CHECK ("monthly_price" >= 0),
        "included_masters" integer NOT NULL DEFAULT 0,
        "extra_master_price" integer NOT NULL DEFAULT 0,
        "max_masters" integer,
        "max_branches" integer,
        "sms_per_month" integer,
        "sms_per_master" integer NOT NULL DEFAULT 0,
        "features" text[] NOT NULL DEFAULT '{}',
        "trial_days" integer NOT NULL DEFAULT 0,
        "is_public" boolean NOT NULL DEFAULT true,
        "position" integer NOT NULL DEFAULT 0
      )`)
    const all = `'{cashdesk,inventory,analytics,loyalty,promotions,mailings,import,payroll,team,deposits}'`
    await queryRunner.query(`
      INSERT INTO "plans" ("key", "title", "description", "monthly_price", "included_masters",
        "extra_master_price", "max_masters", "max_branches", "sms_per_month", "sms_per_master",
        "features", "trial_days", "is_public", "position") VALUES
      ('start', 'Старт', 'Страница, онлайн-запись и расписание', 0, 0, 0, 2, 1, 50, 0, '{}', 0, true, 1),
      ('business', 'Бизнес', 'Касса, склад, аналитика, лояльность и рассылки', 990, 3, 290, NULL, 3, 0, 300, ${all}, 30, true, 2),
      ('founders', 'Основатель', 'Всё без ограничений для первых бизнесов', 0, 0, 0, NULL, NULL, NULL, 0, ${all}, 0, false, 3)`)

    await queryRunner.query(`
      CREATE TABLE "sms_packs" (
        "key" varchar(32) PRIMARY KEY,
        "size" integer NOT NULL CHECK ("size" > 0),
        "price" integer NOT NULL CHECK ("price" > 0),
        "position" integer NOT NULL DEFAULT 0
      )`)
    await queryRunner.query(
      `INSERT INTO "sms_packs" ("key", "size", "price", "position") VALUES ('sms500', 500, 900, 1)`,
    )

    await queryRunner.query(`
      CREATE TABLE "business_subscriptions" (
        "business_id" uuid PRIMARY KEY REFERENCES "businesses"("id") ON DELETE CASCADE,
        "plan_key" varchar(32) NOT NULL REFERENCES "plans"("key"),
        "trial_ends_at" timestamptz,
        "paid_until" timestamptz,
        "is_lifetime" boolean NOT NULL DEFAULT false,
        "sms_extra" integer NOT NULL DEFAULT 0 CHECK ("sms_extra" >= 0),
        "last_reminder" varchar(64),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_business_subscriptions_plan" ON "business_subscriptions" ("plan_key")',
    )
    await queryRunner.query(`
      INSERT INTO "business_subscriptions" ("business_id", "plan_key", "is_lifetime")
      SELECT "id", 'founders', true FROM "businesses"`)

    await queryRunner.query(`
      CREATE TABLE "plan_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "kind" varchar(8) NOT NULL CHECK ("kind" IN ('plan', 'sms')),
        "plan_key" varchar(32) REFERENCES "plans"("key"),
        "months" integer,
        "sms_count" integer,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "due_at" timestamptz NOT NULL,
        "paid_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_plan_orders_business" ON "plan_orders" ("business_id", "created_at")',
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_plan_orders_customer" ON "plan_orders" ("customer_id")',
    )
    await queryRunner.query('CREATE INDEX "IDX_plan_orders_plan" ON "plan_orders" ("plan_key")')

    await queryRunner.query(`
      CREATE TABLE "sms_usage" (
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "month" date NOT NULL,
        "sent" integer NOT NULL DEFAULT 0,
        PRIMARY KEY ("business_id", "month")
      )`)

    // The same columns other order kinds (gift certificates, subscriptions) add: whichever
    // migration runs first creates them.
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP NOT NULL`)
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "kind" varchar(16) NOT NULL DEFAULT 'booking'`,
    )
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "order_id" uuid`)
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "payments_order" ON "payments" ("kind", "order_id") WHERE "order_id" IS NOT NULL',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "payments" WHERE "kind" = 'billing'`)
    await queryRunner.query('DROP TABLE "sms_usage"')
    await queryRunner.query('DROP TABLE "plan_orders"')
    await queryRunner.query('DROP TABLE "business_subscriptions"')
    await queryRunner.query('DROP TABLE "sms_packs"')
    await queryRunner.query('DROP TABLE "plans"')
  }
}
