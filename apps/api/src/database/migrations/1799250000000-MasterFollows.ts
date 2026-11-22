import type { MigrationInterface, QueryRunner } from 'typeorm'

// Clients follow their master: freed time, a move to another place and (when asked) new works.
// `master_follow_notices` keeps freed time of one master to one message a day.
export class MasterFollows1799250000000 implements MigrationInterface {
  name = 'MasterFollows1799250000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "master_follows" (
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "notify_works" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_notified_at" timestamptz,
        "works_notified_at" timestamptz,
        "moved_notified_to" varchar(64),
        PRIMARY KEY ("customer_id", "specialist_id")
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_master_follows_specialist" ON "master_follows" ("specialist_id")',
    )
    await queryRunner.query(`
      CREATE TABLE "master_follow_notices" (
        "specialist_id" varchar(64) NOT NULL REFERENCES "specialists"("id") ON DELETE CASCADE,
        "day" date NOT NULL,
        PRIMARY KEY ("specialist_id", "day")
      )`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "master_follow_notices"')
    await queryRunner.query('DROP TABLE "master_follows"')
  }
}
