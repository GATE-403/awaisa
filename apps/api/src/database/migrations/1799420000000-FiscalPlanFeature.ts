import type { MigrationInterface, QueryRunner } from 'typeorm'

// Fiscal receipts are a paid-plan feature: «Бизнес» and «Основатель» get it, «Старт» does not.
// A migration of its own, not an edit of `BusinessPlans`, which has already run on databases.
export class FiscalPlanFeature1799420000000 implements MigrationInterface {
  name = 'FiscalPlanFeature1799420000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "plans" SET "features" = array_append("features", 'fiscal')
       WHERE "key" IN ('business', 'founders') AND NOT ('fiscal' = ANY("features"))`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "plans" SET "features" = array_remove("features", 'fiscal')
       WHERE "key" IN ('business', 'founders')`,
    )
  }
}
