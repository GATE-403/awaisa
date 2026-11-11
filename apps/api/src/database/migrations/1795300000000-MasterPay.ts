import type { MigrationInterface, QueryRunner } from 'typeorm'

export class MasterPay1795300000000 implements MigrationInterface {
  name = 'MasterPay1795300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // The master's share of what their visits earn; null = not set.
    await queryRunner.query(
      'ALTER TABLE "specialists" ADD COLUMN "commission_percent" smallint CHECK ("commission_percent" BETWEEN 0 AND 100)',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "commission_percent"')
  }
}
