import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CustomerProfile1796700000000 implements MigrationInterface {
  name = 'CustomerProfile1796700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A client's public profile: banner and colour (preset keys), a short status, who sees it.
    await queryRunner.query(`ALTER TABLE "customers"
      ADD "banner" varchar(16),
      ADD "accent" varchar(16),
      ADD "status" varchar(80) NOT NULL DEFAULT '',
      ADD "is_public" boolean NOT NULL DEFAULT true,
      ADD "show_places" boolean NOT NULL DEFAULT true`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers"
      DROP COLUMN "banner", DROP COLUMN "accent", DROP COLUMN "status",
      DROP COLUMN "is_public", DROP COLUMN "show_places"`)
  }
}
