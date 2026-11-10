import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ReviewsAndTelegram1794900000000 implements MigrationInterface {
  name = 'ReviewsAndTelegram1794900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // One review per visit: rating of the visit and its master, an optional reply from the business.
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "booking_id" uuid NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
        "specialist_id" varchar(64) NOT NULL,
        "service_id" varchar(64) NOT NULL,
        "rating" smallint NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
        "comment" text NOT NULL DEFAULT '',
        "author_name" varchar(120) NOT NULL,
        "reply" text,
        "replied_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "reviews_business_created" ON "reviews" ("business_id", "created_at" DESC)',
    )
    // The «how was it?» message goes out once, a while after the visit ends.
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN "review_requested_at" timestamptz')

    // Owners and staff link Telegram chats to a business to get bookings there.
    await queryRunner.query(`
      CREATE TABLE "telegram_chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "chat_id" bigint NOT NULL,
        "username" varchar(64) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("business_id", "chat_id")
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "telegram_link_codes" (
        "code" varchar(32) PRIMARY KEY,
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE CASCADE,
        "expires_at" timestamptz NOT NULL
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "telegram_link_codes"')
    await queryRunner.query('DROP TABLE "telegram_chats"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "review_requested_at"')
    await queryRunner.query('DROP TABLE "reviews"')
  }
}
