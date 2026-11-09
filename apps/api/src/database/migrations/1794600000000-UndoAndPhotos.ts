import type { MigrationInterface, QueryRunner } from 'typeorm'

export class UndoAndPhotos1794600000000 implements MigrationInterface {
  name = 'UndoAndPhotos1794600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamptz')
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN "cover_url" varchar(512),
        ADD COLUMN "photos" jsonb NOT NULL DEFAULT '[]'
    `)
    await queryRunner.query('ALTER TABLE "specialists" ADD COLUMN "photo_url" varchar(512)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "photo_url"')
    await queryRunner.query(
      'ALTER TABLE "businesses" DROP COLUMN "photos", DROP COLUMN "cover_url"',
    )
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "cancelled_at"')
  }
}
