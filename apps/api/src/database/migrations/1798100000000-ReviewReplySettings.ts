import type { MigrationInterface, QueryRunner } from 'typeorm'

// So a business does not answer every review by hand: an automatic reply to good reviews (from
// a chosen rating, with a template, only for reviews that arrive after it is switched on) and the
// owner's quick replies offered above the reply field. Auto replies are marked on the review, so
// the cabinet can tell them from the ones the owner wrote.
export class ReviewReplySettings1798100000000 implements MigrationInterface {
  name = 'ReviewReplySettings1798100000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "review_reply_settings" (
         "business_id" uuid PRIMARY KEY REFERENCES "businesses"("id") ON DELETE CASCADE,
         "auto_enabled" boolean NOT NULL DEFAULT false,
         "auto_min_rating" smallint NOT NULL DEFAULT 5 CHECK ("auto_min_rating" BETWEEN 4 AND 5),
         "auto_template" text NOT NULL DEFAULT '',
         "auto_since" timestamptz,
         "quick_replies" jsonb NOT NULL DEFAULT '[]',
         "updated_at" timestamptz NOT NULL DEFAULT now()
       )`,
    )
    await queryRunner.query(
      'ALTER TABLE "reviews" ADD "is_auto_reply" boolean NOT NULL DEFAULT false',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN "is_auto_reply"')
    await queryRunner.query('DROP TABLE "review_reply_settings"')
  }
}
