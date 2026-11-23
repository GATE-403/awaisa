import type { MigrationInterface, QueryRunner } from 'typeorm'

// Offer cards compare a price with the same service elsewhere («Дешевле 70% мест»): that lookup
// goes by the service's name, regardless of case, once per card.
export class ServiceNameIndex1799310000000 implements MigrationInterface {
  name = 'ServiceNameIndex1799310000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_services_lower_name" ON "services" (lower("name")) WHERE "is_active"',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_services_lower_name"')
  }
}
