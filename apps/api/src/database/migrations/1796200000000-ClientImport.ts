import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ClientImport1796200000000 implements MigrationInterface {
  name = 'ClientImport1796200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Clients imported from another system have a name before they have any booking here.
    await queryRunner.query('ALTER TABLE "client_records" ADD "name" varchar(120)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "client_records" DROP COLUMN "name"')
  }
}
