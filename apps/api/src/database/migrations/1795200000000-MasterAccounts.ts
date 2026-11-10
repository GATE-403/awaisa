import type { MigrationInterface, QueryRunner } from 'typeorm'

export class MasterAccounts1795200000000 implements MigrationInterface {
  name = 'MasterAccounts1795200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A master signs in with this number and sees only their own day.
    await queryRunner.query('ALTER TABLE "specialists" ADD COLUMN "phone" varchar(32)')
    await queryRunner.query(
      'CREATE INDEX "specialists_phone" ON "specialists" ("phone") WHERE "phone" IS NOT NULL',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "specialists_phone"')
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "phone"')
  }
}
