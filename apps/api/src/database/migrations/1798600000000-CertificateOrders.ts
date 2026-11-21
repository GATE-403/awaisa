import type { MigrationInterface, QueryRunner } from 'typeorm'

// Gift certificates bought by clients on the place's page: the owner turns the sale on and picks
// the amounts, an order waits for its payment and the certificate is issued only once it is paid.
// Payments stop being only a booking's deposit: `kind` and `order_id` name what else they pay for.
export class CertificateOrders1798600000000 implements MigrationInterface {
  name = 'CertificateOrders1798600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD "certificates_online" boolean NOT NULL DEFAULT false,
         ADD "certificate_amounts" integer[] NOT NULL DEFAULT '{}'`,
    )

    await queryRunner.query(`
      CREATE TABLE "certificate_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "amount" integer NOT NULL CHECK ("amount" > 0),
        "buyer_name" varchar(80) NOT NULL,
        "buyer_phone" varchar(20) NOT NULL,
        "recipient_name" varchar(80) NOT NULL DEFAULT '',
        "recipient_phone" varchar(20),
        "message" varchar(300) NOT NULL DEFAULT '',
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "due_at" timestamptz NOT NULL,
        "paid_at" timestamptz,
        "certificate_id" uuid REFERENCES "gift_certificates"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "certificate_orders_business" ON "certificate_orders" ("business_id", "paid_at")',
    )
    await queryRunner.query(
      'CREATE INDEX "certificate_orders_customer" ON "certificate_orders" ("customer_id")',
    )
    await queryRunner.query(
      'CREATE INDEX "certificate_orders_certificate" ON "certificate_orders" ("certificate_id")',
    )
    await queryRunner.query(
      `CREATE INDEX "certificate_orders_pending" ON "certificate_orders" ("due_at") WHERE "status" = 'pending'`,
    )

    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP NOT NULL,
         ADD "kind" varchar(16) NOT NULL DEFAULT 'booking',
         ADD "order_id" uuid`,
    )
    await queryRunner.query(
      'CREATE INDEX "payments_order" ON "payments" ("kind", "order_id") WHERE "order_id" IS NOT NULL',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "payments_order"')
    await queryRunner.query(`DELETE FROM "payments" WHERE "booking_id" IS NULL`)
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "order_id", DROP COLUMN "kind",
         ALTER COLUMN "booking_id" SET NOT NULL`,
    )
    await queryRunner.query('DROP TABLE "certificate_orders"')
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP COLUMN "certificate_amounts", DROP COLUMN "certificates_online"`,
    )
  }
}
