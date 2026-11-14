import type { MigrationInterface, QueryRunner } from 'typeorm'

export class WorkPhotoLikes1797300000000 implements MigrationInterface {
  name = 'WorkPhotoLikes1797300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // «Нравится» in «Работы»: one like per device session, and a running count on the photo.
    await queryRunner.query('ALTER TABLE "work_photos" ADD "likes" integer NOT NULL DEFAULT 0')
    await queryRunner.query(`CREATE TABLE "work_photo_likes" (
      "photo_id" uuid NOT NULL REFERENCES "work_photos"("id") ON DELETE CASCADE,
      "session" varchar(64) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("photo_id", "session")
    )`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "work_photo_likes"')
    await queryRunner.query('ALTER TABLE "work_photos" DROP COLUMN "likes"')
  }
}
