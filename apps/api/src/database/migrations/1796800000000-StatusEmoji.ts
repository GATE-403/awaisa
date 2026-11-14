import type { MigrationInterface, QueryRunner } from 'typeorm'

export class StatusEmoji1796800000000 implements MigrationInterface {
  name = 'StatusEmoji1796800000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // The emoji in front of a client's status, like Discord's custom status.
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "status_emoji" varchar(16) NOT NULL DEFAULT ''`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "customers" DROP COLUMN "status_emoji"')
  }
}
