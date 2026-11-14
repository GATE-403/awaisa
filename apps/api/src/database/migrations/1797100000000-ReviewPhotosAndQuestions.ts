import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ReviewPhotosAndQuestions1797100000000 implements MigrationInterface {
  name = 'ReviewPhotosAndQuestions1797100000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // Up to three pictures a client adds to their review; they also go to the place's «Работы».
    await queryRunner.query(`CREATE TABLE "review_photos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "review_id" uuid NOT NULL REFERENCES "reviews"("id") ON DELETE CASCADE,
      "url" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query('CREATE INDEX "review_photos_review" ON "review_photos" ("review_id")')
    // «Вопросы» on a business page: a signed-in client asks, the owner answers in the cabinet.
    await queryRunner.query(`CREATE TABLE "business_questions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
      "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
      "author_name" varchar(120) NOT NULL,
      "text" text NOT NULL,
      "answer" text,
      "answered_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "business_questions_business" ON "business_questions" ("business_id", "created_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "business_questions"')
    await queryRunner.query('DROP TABLE "review_photos"')
  }
}
