import type { MigrationInterface, QueryRunner } from 'typeorm'

// Subscriptions sold on the place's page: a plan may be sold online, an order waits for its
// payment and only a paid order becomes the client's subscription. A booking may be planned to
// be paid by a subscription (drawn when the salon marks «Пришёл»).
export class SubscriptionsOnline1798650000000 implements MigrationInterface {
  name = 'SubscriptionsOnline1798650000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "subscription_plans" ADD "is_online" boolean NOT NULL DEFAULT false',
    )
    await queryRunner.query(`
      CREATE TABLE "subscription_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "plan_id" uuid REFERENCES "subscription_plans"("id") ON DELETE SET NULL,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "phone" varchar(32) NOT NULL,
        "title" varchar(80) NOT NULL,
        "service_id" varchar(64) REFERENCES "services"("id") ON DELETE SET NULL,
        "visits" smallint NOT NULL,
        "valid_days" smallint NOT NULL,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'paid', 'expired')),
        "due_at" timestamptz NOT NULL,
        "subscription_id" uuid REFERENCES "client_subscriptions"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "paid_at" timestamptz
      )
    `)
    await queryRunner.query(
      `CREATE INDEX "subscription_orders_pending" ON "subscription_orders" ("due_at") WHERE "status" = 'pending'`,
    )
    for (const column of [
      'business_id',
      'plan_id',
      'customer_id',
      'service_id',
      'booking_id',
      'subscription_id',
    ]) {
      await queryRunner.query(
        `CREATE INDEX "subscription_orders_${column}" ON "subscription_orders" ("${column}")`,
      )
    }

    // Payments of orders other than a booking's deposit: the shared `kind` + `order_id` (the gift
    // certificates and business plans add the same columns; whichever migration runs first wins).
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP NOT NULL,
         ADD COLUMN IF NOT EXISTS "kind" varchar(16) NOT NULL DEFAULT 'booking',
         ADD COLUMN IF NOT EXISTS "order_id" uuid`,
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "payments_order" ON "payments" ("kind", "order_id") WHERE "order_id" IS NOT NULL',
    )

    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "subscription_id" uuid
         REFERENCES "client_subscriptions"("id") ON DELETE SET NULL`,
    )
    await queryRunner.query(
      'CREATE INDEX "bookings_subscription" ON "bookings" ("subscription_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "subscription_id"')
    // The shared payment columns stay: other order kinds may use them.
    await queryRunner.query(`DELETE FROM "payments" WHERE "kind" = 'subscription'`)
    await queryRunner.query('DROP TABLE "subscription_orders"')
    await queryRunner.query('ALTER TABLE "subscription_plans" DROP COLUMN "is_online"')
  }
}
