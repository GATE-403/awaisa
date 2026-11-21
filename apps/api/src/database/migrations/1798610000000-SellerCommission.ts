import type { MigrationInterface, QueryRunner } from 'typeorm'

// A master's percent of the products they sold at the counter (`sales.seller_specialist_id`).
export class SellerCommission1798610000000 implements MigrationInterface {
  name = 'SellerCommission1798610000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "specialists"
        ADD "products_percent" smallint CHECK ("products_percent" BETWEEN 0 AND 100)
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "specialists" DROP COLUMN "products_percent"')
  }
}
