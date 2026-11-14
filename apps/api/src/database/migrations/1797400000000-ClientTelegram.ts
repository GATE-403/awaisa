import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ClientTelegram1797400000000 implements MigrationInterface {
  name = 'ClientTelegram1797400000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Clients who asked for reminders in Telegram instead of SMS: one chat per phone number.
    await queryRunner.query(`CREATE TABLE "client_telegram_chats" (
      "phone" varchar(20) PRIMARY KEY,
      "chat_id" bigint NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_client_telegram_chats_chat" ON "client_telegram_chats" ("chat_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "client_telegram_chats"')
  }
}
