import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Удалить аккаунт»: a review stays with its place but no longer leads to its author.
export class AccountErasure1798590000000 implements MigrationInterface {
  name = 'AccountErasure1798590000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" ADD COLUMN "anonymized_at" timestamptz')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN "anonymized_at"')
  }
}
