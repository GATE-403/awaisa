import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Войти через Telegram»: a token per attempt, the chat that opened it and the shared number.
export class TelegramLogins1797800000000 implements MigrationInterface {
  name = 'TelegramLogins1797800000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "telegram_logins" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "token_hash" varchar(64) NOT NULL UNIQUE,
      "chat_id" varchar(32),
      "phone" varchar(20),
      "status" varchar(12) NOT NULL DEFAULT 'pending',
      "expires_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_telegram_logins_chat" ON "telegram_logins" ("chat_id", "created_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "telegram_logins"')
  }
}
