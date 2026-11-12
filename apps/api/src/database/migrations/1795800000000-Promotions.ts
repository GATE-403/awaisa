import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Promotions1795800000000 implements MigrationInterface {
  name = 'Promotions1795800000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "title" varchar(80) NOT NULL,
        "kind" varchar(16) NOT NULL CHECK ("kind" IN ('happy_hours', 'first_visit', 'promo_code')),
        "percent" smallint NOT NULL CHECK ("percent" BETWEEN 1 AND 90),
        "code" varchar(40),
        "weekdays" smallint[],
        "from_minutes" smallint CHECK ("from_minutes" BETWEEN 0 AND 1440),
        "to_minutes" smallint CHECK ("to_minutes" BETWEEN 0 AND 1440),
        "service_ids" varchar(64)[],
        "starts_on" date,
        "ends_on" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("kind" <> 'promo_code' OR "code" IS NOT NULL)
      )
    `)
    await queryRunner.query(
      'CREATE UNIQUE INDEX "promotions_code" ON "promotions" ("business_id", "code") WHERE "code" IS NOT NULL',
    )
    // The booking keeps the discount it was made with, even if the promotion changes later.
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN "promotion_id" uuid REFERENCES "promotions"("id") ON DELETE SET NULL,
        ADD COLUMN "discount_amount" integer CHECK ("discount_amount" > 0),
        ADD COLUMN "discount_title" varchar(80)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "bookings" DROP COLUMN "promotion_id", DROP COLUMN "discount_amount", DROP COLUMN "discount_title"',
    )
    await queryRunner.query('DROP TABLE "promotions"')
  }
}
