import type { MigrationInterface, QueryRunner } from 'typeorm'

// Tickets of the app's pushes, kept until their receipt says whether Apple or Google delivered
// them: a device dropped after Expo took the message is only known from the receipt. A token
// forgotten takes its tickets with it.
export class PushTickets1799100000000 implements MigrationInterface {
  name = 'PushTickets1799100000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_tickets" (
        "id" varchar(64) PRIMARY KEY,
        "endpoint" text NOT NULL REFERENCES "push_subscriptions"("endpoint") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_push_tickets_endpoint" ON "push_tickets" ("endpoint")',
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_push_tickets_created_at" ON "push_tickets" ("created_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "push_tickets"')
  }
}
