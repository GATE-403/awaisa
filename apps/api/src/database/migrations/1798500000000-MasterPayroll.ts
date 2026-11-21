import type { MigrationInterface, QueryRunner } from 'typeorm'

// Master pay beyond one percent: a salary per month or per working day, a guaranteed minimum per
// month, a percent or a fixed sum per service, and payouts the owner marks. The percent of the
// services stays in `specialists.commission_percent`, so the percents set before keep working.
export class MasterPayroll1798500000000 implements MigrationInterface {
  name = 'MasterPayroll1798500000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "specialists"
        ADD "salary_kind" varchar(8) CHECK ("salary_kind" IN ('month', 'day')),
        ADD "salary_amount" int CHECK ("salary_amount" >= 0),
        ADD "pay_minimum" int CHECK ("pay_minimum" >= 0)
    `)
    await queryRunner.query(`
      CREATE TABLE "master_service_rates" (
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "kind" varchar(8) NOT NULL CHECK ("kind" IN ('percent', 'fixed')),
        "value" int NOT NULL CHECK ("value" >= 0),
        PRIMARY KEY ("specialist_id", "service_id")
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "master_service_rates_service" ON "master_service_rates" ("service_id")',
    )
    await queryRunner.query(`
      CREATE TABLE "master_payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "period_from" date NOT NULL,
        "period_to" date NOT NULL,
        "amount" int NOT NULL CHECK ("amount" > 0),
        "paid_on" date NOT NULL,
        "note" varchar(200) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CHECK ("period_from" <= "period_to")
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "master_payouts_business" ON "master_payouts" ("business_id", "period_to")',
    )
    await queryRunner.query(
      'CREATE INDEX "master_payouts_specialist" ON "master_payouts" ("specialist_id", "period_to")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "master_payouts"')
    await queryRunner.query('DROP TABLE "master_service_rates"')
    await queryRunner.query(
      'ALTER TABLE "specialists" DROP COLUMN "pay_minimum", DROP COLUMN "salary_amount", DROP COLUMN "salary_kind"',
    )
  }
}
