import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Фото клиента»: a work photo that came from a client's review, not from the salon. Photos
// already shared from reviews are marked by their file.
export class WorkPhotoFromClient1799200000000 implements MigrationInterface {
  name = 'WorkPhotoFromClient1799200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "work_photos" ADD "is_from_client" boolean NOT NULL DEFAULT false',
    )
    await queryRunner.query(
      `UPDATE "work_photos" w SET "is_from_client" = true
       WHERE EXISTS (SELECT 1 FROM "review_photos" rp WHERE rp."url" = w."url")`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "work_photos" DROP COLUMN "is_from_client"')
  }
}
