import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ProfileShowcase1796900000000 implements MigrationInterface {
  name = 'ProfileShowcase1796900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // A few lines about oneself, up to three achievements shown by the name, the master one goes to.
    await queryRunner.query(`ALTER TABLE "customers"
      ADD "about" varchar(160) NOT NULL DEFAULT '',
      ADD "featured_badges" text[] NOT NULL DEFAULT '{}',
      ADD "favorite_master_id" varchar(64)`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers"
      DROP COLUMN "about", DROP COLUMN "featured_badges", DROP COLUMN "favorite_master_id"`)
  }
}
