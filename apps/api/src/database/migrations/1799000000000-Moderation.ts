import type { MigrationInterface, QueryRunner } from 'typeorm'

// Reports become records a platform admin works through: what was reported, by whom (a device
// session or an account), why and when. Decisions are kept as a journal; a «keep» decision stops
// automatic hiding of that thing. Reviews and people can be hidden like work photos.
export class Moderation1799000000000 implements MigrationInterface {
  name = 'Moderation1799000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_type" varchar(16) NOT NULL,
        "target_id" varchar(64) NOT NULL,
        "reason" varchar(24) NOT NULL,
        "reporter" varchar(80) NOT NULL,
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz
      )`)
    // One open report per thing and reporter: a second tap from the same device counts once.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "reports_open_once" ON "reports" ("target_type", "target_id", "reporter")
       WHERE "resolved_at" IS NULL`,
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "reports_customer" ON "reports" ("customer_id")',
    )
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "moderation_decisions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_type" varchar(16) NOT NULL,
        "target_id" varchar(64) NOT NULL,
        "action" varchar(16) NOT NULL,
        "reports" int NOT NULL DEFAULT 0,
        "preview" jsonb NOT NULL DEFAULT '{}',
        "admin_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`)
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "moderation_decisions_target" ON "moderation_decisions" ("target_type", "target_id")',
    )
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "moderation_decisions_admin" ON "moderation_decisions" ("admin_id")',
    )
    // People by phone: guests who only left reviews have a public profile but no account.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "moderated_people" (
        "phone" varchar(16) PRIMARY KEY,
        "hidden_at" timestamptz,
        "blocked_at" timestamptz
      )`)
    await queryRunner.query(
      'ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false',
    )
    // Hidden by a moderator: the owner cannot show it again from the cabinet.
    await queryRunner.query(
      'ALTER TABLE "work_photos" ADD COLUMN IF NOT EXISTS "is_moderated" boolean NOT NULL DEFAULT false',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "work_photos" DROP COLUMN IF EXISTS "is_moderated"')
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN IF EXISTS "is_hidden"')
    await queryRunner.query('DROP TABLE IF EXISTS "moderated_people"')
    await queryRunner.query('DROP TABLE IF EXISTS "moderation_decisions"')
    await queryRunner.query('DROP TABLE IF EXISTS "reports"')
  }
}
