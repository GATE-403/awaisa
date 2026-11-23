import type { MigrationInterface, QueryRunner } from 'typeorm'

// A waitlist entry remembers every service of the visit, not just the first: a full day for
// «Коррекция бровей + Ламинирование» may still have time for the brows alone.
export class WaitlistExtras1799410000000 implements MigrationInterface {
  name = 'WaitlistExtras1799410000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" ADD COLUMN IF NOT EXISTS "extra_service_ids" varchar(64)[] NOT NULL DEFAULT '{}'`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "waitlist_entries" DROP COLUMN IF EXISTS "extra_service_ids"',
    )
  }
}
