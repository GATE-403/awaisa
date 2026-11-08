import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitBookingSchema1794200000000 implements MigrationInterface {
  name = 'InitBookingSchema1794200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist')

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" varchar(64) PRIMARY KEY,
        "name" varchar(120) NOT NULL,
        "position" int NOT NULL DEFAULT 0
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" varchar(64) PRIMARY KEY,
        "category_id" varchar(64) NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
        "name" varchar(160) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "duration_minutes" int NOT NULL CHECK ("duration_minutes" > 0),
        "price" int NOT NULL CHECK ("price" >= 0),
        "is_popular" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "position" int NOT NULL DEFAULT 0
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "specialists" (
        "id" varchar(64) PRIMARY KEY,
        "name" varchar(160) NOT NULL,
        "role" varchar(120) NOT NULL,
        "rating" numeric(2, 1) NOT NULL DEFAULT 5,
        "is_active" boolean NOT NULL DEFAULT true,
        "position" int NOT NULL DEFAULT 0
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "specialist_services" (
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        PRIMARY KEY ("specialist_id", "service_id")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id") ON DELETE RESTRICT,
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE RESTRICT,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "customer_name" varchar(120) NOT NULL,
        "customer_phone" varchar(32) NOT NULL,
        "comment" text NOT NULL DEFAULT '',
        "status" varchar(16) NOT NULL DEFAULT 'confirmed' CHECK ("status" IN ('confirmed', 'cancelled')),
        "cancel_token_hash" varchar(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("ends_at" > "starts_at"),
        CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (
          "specialist_id" WITH =,
          tstzrange("starts_at", "ends_at") WITH &&
        ) WHERE ("status" = 'confirmed')
      )
    `)

    await queryRunner.query(
      'CREATE INDEX "bookings_specialist_starts_at_idx" ON "bookings" ("specialist_id", "starts_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "bookings"')
    await queryRunner.query('DROP TABLE "specialist_services"')
    await queryRunner.query('DROP TABLE "specialists"')
    await queryRunner.query('DROP TABLE "services"')
    await queryRunner.query('DROP TABLE "categories"')
  }
}
