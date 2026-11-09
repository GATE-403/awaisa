import type { MigrationInterface, QueryRunner } from 'typeorm'

const AWAISA_STUDIO_ID = '00000000-0000-4000-8000-00000000a001'

export class Branches1794700000000 implements MigrationInterface {
  name = 'Branches1794700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name" varchar(120) NOT NULL,
        "address" varchar(200) NOT NULL DEFAULT '',
        "phone" varchar(32) NOT NULL DEFAULT '',
        "latitude" double precision,
        "longitude" double precision,
        "position" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
        CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
      )
    `)
    await queryRunner.query('CREATE INDEX "branches_business_id" ON "branches" ("business_id")')
    await queryRunner.query(
      'ALTER TABLE "specialists" ADD COLUMN "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL',
    )
    await queryRunner.query(
      'ALTER TABLE "bookings" ADD COLUMN "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL',
    )
    // Every business starts with one branch at its current address.
    await queryRunner.query(`
      INSERT INTO "branches" ("business_id", "name", "address", "phone", "position")
      SELECT "id", 'Основной', "address", "phone", 1 FROM "businesses"
    `)
    // Awaisa Studio gets a pin in central Bishkek so the map is not empty; owners move it in the cabinet.
    await queryRunner.query(
      `UPDATE "branches" SET "latitude" = 42.8746, "longitude" = 74.6122 WHERE "business_id" = $1`,
      [AWAISA_STUDIO_ID],
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "branch_id"')
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "branch_id"')
    await queryRunner.query('DROP TABLE "branches"')
  }
}
