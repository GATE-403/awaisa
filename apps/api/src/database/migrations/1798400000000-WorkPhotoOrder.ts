import type { MigrationInterface, QueryRunner } from 'typeorm'

// The owner arranges «Работы» by hand (the first five lead the public page): a place in the order,
// null for photos never arranged, which stay first, newest first, as before.
export class WorkPhotoOrder1798400000000 implements MigrationInterface {
  name = 'WorkPhotoOrder1798400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "work_photos" ADD "position" int')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "work_photos" DROP COLUMN "position"')
  }
}
