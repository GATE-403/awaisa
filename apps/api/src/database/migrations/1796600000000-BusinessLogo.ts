import type { MigrationInterface, QueryRunner } from 'typeorm'

export class BusinessLogo1796600000000 implements MigrationInterface {
  name = 'BusinessLogo1796600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "businesses" ADD "logo_url" varchar(512)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "logo_url"')
  }
}
