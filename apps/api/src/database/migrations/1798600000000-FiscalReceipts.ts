import type { MigrationInterface, QueryRunner } from 'typeorm'

// Fiscal receipts for the counter: each business's tax settings and its own login at the cash
// register provider, and a queue of receipts for sales, paid visits and their refunds.
export class FiscalReceipts1798600000000 implements MigrationInterface {
  name = 'FiscalReceipts1798600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fiscal_settings" (
        "business_id" uuid PRIMARY KEY REFERENCES "businesses"("id") ON DELETE CASCADE,
        "is_enabled" boolean NOT NULL DEFAULT false,
        "inn" varchar(14),
        "tax_regime" varchar(8) NOT NULL DEFAULT 'general'
          CHECK ("tax_regime" IN ('general', 'single', 'patent')),
        "is_vat_payer" boolean NOT NULL DEFAULT false,
        "vat_rate" numeric(5, 2) NOT NULL DEFAULT 12 CHECK ("vat_rate" BETWEEN 0 AND 30),
        "sales_tax_services" numeric(5, 2) NOT NULL DEFAULT 3
          CHECK ("sales_tax_services" BETWEEN 0 AND 10),
        "sales_tax_goods" numeric(5, 2) NOT NULL DEFAULT 2 CHECK ("sales_tax_goods" BETWEEN 0 AND 10),
        "provider_login" varchar(120),
        -- AES-GCM with a key derived from AUTH_SECRET (fiscal/secret-box.ts).
        "provider_secret" text,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "fiscal_receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
        "kind" varchar(6) NOT NULL CHECK ("kind" IN ('sale', 'refund')),
        "sale_id" uuid REFERENCES "sales"("id") ON DELETE SET NULL,
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "refund_of" uuid REFERENCES "fiscal_receipts"("id") ON DELETE SET NULL,
        "status" varchar(9) NOT NULL DEFAULT 'pending'
          CHECK ("status" IN ('pending', 'sending', 'issued', 'failed', 'cancelled')),
        "is_refunded" boolean NOT NULL DEFAULT false,
        "driver" varchar(16) NOT NULL,
        "inn" varchar(14),
        "tax_regime" varchar(8) NOT NULL,
        "payment" varchar(8) NOT NULL CHECK ("payment" IN ('cash', 'cashless')),
        "lines" jsonb NOT NULL,
        "total" numeric(12, 2) NOT NULL CHECK ("total" > 0),
        "vat_amount" numeric(12, 2) NOT NULL DEFAULT 0,
        "sales_tax_amount" numeric(12, 2) NOT NULL DEFAULT 0,
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
        "last_error" varchar(300),
        "fiscal_number" varchar(64),
        "fiscal_sign" varchar(64),
        "provider_url" varchar(500),
        "issued_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    // One live sale receipt per visit and per sale: a re-marked visit refunds or drops the old one
    // before it gets a new one, and two saves at once cannot issue two.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "fiscal_receipts_live_booking" ON "fiscal_receipts" ("booking_id")
       WHERE "kind" = 'sale' AND "sale_id" IS NULL AND NOT "is_refunded"
         AND "status" IN ('pending', 'sending', 'issued', 'failed')`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "fiscal_receipts_live_sale" ON "fiscal_receipts" ("sale_id")
       WHERE "kind" = 'sale' AND NOT "is_refunded"
         AND "status" IN ('pending', 'sending', 'issued', 'failed')`,
    )
    await queryRunner.query(
      `CREATE INDEX "fiscal_receipts_due" ON "fiscal_receipts" ("next_attempt_at")
       WHERE "status" = 'pending'`,
    )
    await queryRunner.query(
      'CREATE INDEX "fiscal_receipts_business" ON "fiscal_receipts" ("business_id", "created_at")',
    )
    await queryRunner.query(
      'CREATE INDEX "fiscal_receipts_branch" ON "fiscal_receipts" ("branch_id")',
    )
    await queryRunner.query('CREATE INDEX "fiscal_receipts_sale" ON "fiscal_receipts" ("sale_id")')
    await queryRunner.query(
      'CREATE INDEX "fiscal_receipts_booking" ON "fiscal_receipts" ("booking_id")',
    )
    await queryRunner.query(
      'CREATE INDEX "fiscal_receipts_refund_of" ON "fiscal_receipts" ("refund_of")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "fiscal_receipts"')
    await queryRunner.query('DROP TABLE "fiscal_settings"')
  }
}
