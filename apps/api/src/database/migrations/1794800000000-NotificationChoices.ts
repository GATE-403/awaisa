import type { MigrationInterface, QueryRunner } from 'typeorm'

export class NotificationChoices1794800000000 implements MigrationInterface {
  name = 'NotificationChoices1794800000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // The client chooses at booking time: a confirmation SMS, and when (if at all) to be reminded.
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN "sms_confirmation" boolean NOT NULL DEFAULT true,
        ADD COLUMN "reminder_minutes" int DEFAULT 120 CHECK ("reminder_minutes" IN (60, 120, 1440))
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "bookings" DROP COLUMN "reminder_minutes", DROP COLUMN "sms_confirmation"',
    )
  }
}
