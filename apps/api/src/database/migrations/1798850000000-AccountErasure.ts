import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Удалить аккаунт»: a review stays with its place but no longer leads to its author.
export class AccountErasure1798850000000 implements MigrationInterface {
  name = 'AccountErasure1798850000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "anonymized_at" timestamptz',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN IF EXISTS "anonymized_at"')
  }
}
