import type { MigrationInterface, QueryRunner } from 'typeorm'

// Calendar subscriptions: a secret ICS address per master (their own visits) and per member of a
// business (every visit, or one master's). A master's feed also names the person who made it, so
// handing the master's number to someone else ends it. Only the token's hash is kept; a new one replaces it.
export class CalendarFeeds1798900000000 implements MigrationInterface {
  name = 'CalendarFeeds1798900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "calendar_feeds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kind" varchar(16) NOT NULL CHECK ("kind" IN ('master', 'business')),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "specialist_id" varchar(64) REFERENCES "specialists"("id") ON DELETE CASCADE,
        "token_hash" varchar(64) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_read_at" timestamptz,
        CHECK ("kind" = 'business' OR "specialist_id" IS NOT NULL)
      )`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_calendar_feeds_master" ON "calendar_feeds" ("specialist_id") WHERE "kind" = 'master'`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_calendar_feeds_member" ON "calendar_feeds" ("business_id", "customer_id") WHERE "kind" = 'business'`,
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_calendar_feeds_customer" ON "calendar_feeds" ("customer_id")',
    )
    await queryRunner.query(
      'ALTER TABLE "businesses" ADD "calendar_phones" boolean NOT NULL DEFAULT false',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "calendar_phones"')
    await queryRunner.query('DROP TABLE "calendar_feeds"')
  }
}
