import type { MigrationInterface, QueryRunner } from 'typeorm'

export class WorkPhotos1796300000000 implements MigrationInterface {
  name = 'WorkPhotos1796300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A photo of a finished work, tied to what was done and by whom: the business page's
    // «Работы» and the «Работы» feed where each photo books that service with that master.
    await queryRunner.query(`
      CREATE TABLE "work_photos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "url" varchar(512) NOT NULL,
        "service_id" varchar(64) REFERENCES "services"("id") ON DELETE SET NULL,
        "specialist_id" varchar(64) REFERENCES "specialists"("id") ON DELETE SET NULL,
        "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
        "is_hidden" boolean NOT NULL DEFAULT false,
        "reports" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "work_photos_feed" ON "work_photos" ("created_at" DESC) WHERE NOT "is_hidden"',
    )
    await queryRunner.query('CREATE INDEX "work_photos_business" ON "work_photos" ("business_id")')
    // The photos businesses already have, oldest first so their order on the page stays.
    await queryRunner.query(`
      INSERT INTO "work_photos" ("business_id", "url", "created_at")
      SELECT b."id", p.url, now() - make_interval(secs => (jsonb_array_length(b."photos") - p.position)::int)
      FROM "businesses" b, jsonb_array_elements_text(b."photos") WITH ORDINALITY AS p(url, position)
    `)
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "photos"')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD COLUMN "photos" jsonb NOT NULL DEFAULT '[]'`,
    )
    await queryRunner.query(`
      UPDATE "businesses" b SET "photos" = COALESCE((SELECT jsonb_agg(w."url" ORDER BY w."created_at")
        FROM "work_photos" w WHERE w."business_id" = b."id"), '[]')
    `)
    await queryRunner.query('DROP TABLE "work_photos"')
  }
}
