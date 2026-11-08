import type { MigrationInterface, QueryRunner } from 'typeorm'

export class OtpChannels1794400000000 implements MigrationInterface {
  name = 'OtpChannels1794400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "otp_codes"
        ADD COLUMN "channel" varchar(16) NOT NULL DEFAULT 'sms' CHECK ("channel" IN ('telegram', 'sms')),
        ADD COLUMN "provider_request_id" varchar(64)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "otp_codes" DROP COLUMN "provider_request_id", DROP COLUMN "channel"',
    )
  }
}
