import type { MigrationInterface, QueryRunner } from 'typeorm'

export class HandlesAndReferrals1797000000000 implements MigrationInterface {
  name = 'HandlesAndReferrals1797000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A short profile address (`/u/<handle>`), unique regardless of case.
    await queryRunner.query('ALTER TABLE "customers" ADD "handle" varchar(24)')
    await queryRunner.query(
      'CREATE UNIQUE INDEX "customers_handle" ON "customers" (lower("handle")) WHERE "handle" IS NOT NULL',
    )
    // Who brought whom: one row per friend's phone, from their first booking by a `?ref=` link.
    await queryRunner.query(`CREATE TABLE "referrals" (
      "id" bigserial PRIMARY KEY,
      "referrer_phone" varchar(16) NOT NULL,
      "friend_phone" varchar(16) NOT NULL UNIQUE,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query('CREATE INDEX "referrals_referrer" ON "referrals" ("referrer_phone")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "referrals"')
    await queryRunner.query('DROP INDEX "customers_handle"')
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "handle"')
  }
}
