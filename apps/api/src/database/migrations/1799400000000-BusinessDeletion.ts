import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Удалить бизнес»: the business row stays as the archive of its books, marked deleted.
export class BusinessDeletion1799400000000 implements MigrationInterface {
  name = 'BusinessDeletion1799400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN IF EXISTS "deleted_at"')
  }
}
