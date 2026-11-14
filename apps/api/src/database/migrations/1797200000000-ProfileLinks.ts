import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ProfileLinks1797200000000 implements MigrationInterface {
  name = 'ProfileLinks1797200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Instagram / Telegram / TikTok handles and a website on a client's profile.
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "social_links" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "social_links"')
  }
}
