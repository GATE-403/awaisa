import type { MigrationInterface, QueryRunner } from 'typeorm'

export class MasterSchedules1795100000000 implements MigrationInterface {
  name = 'MasterSchedules1795100000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A master either follows the business hours or has their own week (no row = day off).
    await queryRunner.query(
      'ALTER TABLE "specialists" ADD COLUMN "has_own_hours" boolean NOT NULL DEFAULT false',
    )
    await queryRunner.query(`
      CREATE TABLE "specialist_hours" (
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "weekday" smallint NOT NULL CHECK ("weekday" BETWEEN 0 AND 6),
        "opens_minutes" int NOT NULL,
        "closes_minutes" int NOT NULL CHECK ("closes_minutes" > "opens_minutes"),
        PRIMARY KEY ("specialist_id", "weekday")
      )
    `)
    // Whole days away: vacation, sick leave, training.
    await queryRunner.query(`
      CREATE TABLE "specialist_leaves" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "starts_on" date NOT NULL,
        "ends_on" date NOT NULL CHECK ("ends_on" >= "starts_on"),
        "reason" varchar(160) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "specialist_leaves_range" ON "specialist_leaves" ("specialist_id", "ends_on")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "specialist_leaves"')
    await queryRunner.query('DROP TABLE "specialist_hours"')
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "has_own_hours"')
  }
}
