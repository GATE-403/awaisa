import type { MigrationInterface, QueryRunner } from 'typeorm'

// What happens after a review lands: a poor one can be marked «Решено» once the owner has spoken
// with the client, and an owner can answer from Telegram: the bot's «write your reply» prompt is
// remembered here, so the owner's reply to that prompt finds its review.
export class ReviewFollowUp1798200000000 implements MigrationInterface {
  name = 'ReviewFollowUp1798200000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" ADD "resolved_at" timestamptz')
    await queryRunner.query(
      `CREATE TABLE "telegram_reply_prompts" (
         "chat_id" varchar(32) NOT NULL,
         "message_id" bigint NOT NULL,
         "review_id" uuid NOT NULL REFERENCES "reviews"("id") ON DELETE CASCADE,
         "created_at" timestamptz NOT NULL DEFAULT now(),
         PRIMARY KEY ("chat_id", "message_id")
       )`,
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_telegram_reply_prompts_review" ON "telegram_reply_prompts" ("review_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "telegram_reply_prompts"')
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN "resolved_at"')
  }
}
