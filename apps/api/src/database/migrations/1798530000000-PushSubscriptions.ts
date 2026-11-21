import type { MigrationInterface, QueryRunner } from 'typeorm'

// Web Push for the business side: a browser (or installed app) of an owner, administrator or
// master that agreed to hear about bookings without the cabinet open.
export class PushSubscriptions1798530000000 implements MigrationInterface {
  name = 'PushSubscriptions1798530000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "endpoint" text NOT NULL UNIQUE,
        "p256dh" varchar(128) NOT NULL,
        "auth" varchar(64) NOT NULL,
        "user_agent" varchar(256) NOT NULL DEFAULT '',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_success_at" timestamptz
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_push_subscriptions_customer" ON "push_subscriptions" ("customer_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "push_subscriptions"')
  }
}
