import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CustomerAvatar1796400000000 implements MigrationInterface {
  name = 'CustomerAvatar1796400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" ADD "avatar_url" varchar(512)')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "avatar_url"')
  }
}
