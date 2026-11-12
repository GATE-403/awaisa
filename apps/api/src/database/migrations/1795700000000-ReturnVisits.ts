import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ReturnVisits1795700000000 implements MigrationInterface {
  name = 'ReturnVisits1795700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // «Пора прийти снова»: N days after a visit to this service the client gets one SMS.
    await queryRunner.query(
      'ALTER TABLE "services" ADD COLUMN "rebook_days" smallint CHECK ("rebook_days" BETWEEN 1 AND 365)',
    )
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN "rebook_reminded_at" timestamptz')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "rebook_reminded_at"')
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN "rebook_days"')
  }
}
