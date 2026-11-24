import type { MigrationInterface, QueryRunner } from 'typeorm'

const AWAISA_ID = '00000000-0000-4000-8000-00000000a001'

const SCOPED_TABLES = ['categories', 'services', 'specialists'] as const

export class Businesses1794500000000 implements MigrationInterface {
  name = 'Businesses1794500000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" varchar(48) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "kind" varchar(32) NOT NULL DEFAULT 'beauty',
        "description" text NOT NULL DEFAULT '',
        "city" varchar(80) NOT NULL DEFAULT 'Бишкек',
        "address" varchar(200) NOT NULL DEFAULT '',
        "phone" varchar(16) NOT NULL DEFAULT '',
        "whatsapp" varchar(16) NOT NULL DEFAULT '',
        "map_url" varchar(500) NOT NULL DEFAULT '',
        "slot_minutes" int NOT NULL DEFAULT 30 CHECK ("slot_minutes" IN (15, 30, 60)),
        "is_published" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "business_members" (
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "role" varchar(16) NOT NULL DEFAULT 'owner' CHECK ("role" IN ('owner', 'staff')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("business_id", "customer_id")
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "business_members_customer_idx" ON "business_members" ("customer_id")',
    )

    // weekday: 0 = Monday … 6 = Sunday; a missing row means the business is closed that day.
    await queryRunner.query(`
      CREATE TABLE "working_hours" (
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "weekday" smallint NOT NULL CHECK ("weekday" BETWEEN 0 AND 6),
        "opens_minutes" int NOT NULL CHECK ("opens_minutes" BETWEEN 0 AND 1440),
        "closes_minutes" int NOT NULL CHECK ("closes_minutes" BETWEEN 0 AND 1440),
        PRIMARY KEY ("business_id", "weekday"),
        CHECK ("closes_minutes" > "opens_minutes")
      )
    `)

    await queryRunner.query(
      `INSERT INTO "businesses" ("id", "slug", "name", "kind", "description", "address", "phone", "whatsapp", "map_url")
       VALUES ($1, 'awaisa-studio', 'Awaisa Studio', 'beauty',
         'Стрижки, окрашивание и уход. Запись онлайн за минуту - без звонков.',
         'ул. Токтогула, 125', '+996555123456', '+996555123456',
         'https://2gis.kg/bishkek/search/Токтогула%20125')`,
      [AWAISA_ID],
    )
    await queryRunner.query(
      `INSERT INTO "working_hours" ("business_id", "weekday", "opens_minutes", "closes_minutes")
       SELECT $1, weekday, 600, 1200 FROM generate_series(0, 6) AS weekday`,
      [AWAISA_ID],
    )

    for (const table of [...SCOPED_TABLES, 'bookings']) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "business_id" uuid`)
      await queryRunner.query(`UPDATE "${table}" SET "business_id" = $1`, [AWAISA_ID])
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN "business_id" SET NOT NULL,
          ADD CONSTRAINT "${table}_business_fk" FOREIGN KEY ("business_id")
            REFERENCES "businesses"("id") ON DELETE CASCADE
      `)
      await queryRunner.query(`CREATE INDEX "${table}_business_idx" ON "${table}" ("business_id")`)
    }

    // Ratings were seeded; new masters start without one instead of a made-up 5.0.
    await queryRunner.query(
      'ALTER TABLE "specialists" ALTER COLUMN "rating" DROP NOT NULL, ALTER COLUMN "rating" DROP DEFAULT',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE "specialists" SET "rating" = 5 WHERE "rating" IS NULL')
    await queryRunner.query(
      'ALTER TABLE "specialists" ALTER COLUMN "rating" SET DEFAULT 5, ALTER COLUMN "rating" SET NOT NULL',
    )
    for (const table of ['bookings', ...SCOPED_TABLES]) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "business_id"`)
    }
    await queryRunner.query('DROP TABLE "working_hours"')
    await queryRunner.query('DROP TABLE "business_members"')
    await queryRunner.query('DROP TABLE "businesses"')
  }
}
