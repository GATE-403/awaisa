import type { MigrationInterface, QueryRunner } from 'typeorm'

// Analytics that says what to do: where a booking came from (online, the staff, an import), so
// the owner sees which way clients book, and the owner's revenue goal for the month. Bookings
// made before this have no way to tell and count as online.
export class AnalyticsInsights1798300000000 implements MigrationInterface {
  name = 'AnalyticsInsights1798300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "source" varchar(8) NOT NULL DEFAULT 'online'`,
    )
    await queryRunner.query('ALTER TABLE "businesses" ADD "revenue_goal" int')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "revenue_goal"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "source"')
  }
}
