import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Mailings1796000000000 implements MigrationInterface {
  name = 'Mailings1796000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // One SMS mailing to a segment of the client base, kept so the same one is not sent twice a day.
    await queryRunner.query(`
      CREATE TABLE "mailings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "segment" varchar(16) NOT NULL CHECK ("segment" IN ('lapsed', 'birthday', 'all')),
        "lapsed_days" smallint,
        "text" text NOT NULL,
        "recipients" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(
      'CREATE INDEX "mailings_business" ON "mailings" ("business_id", "created_at")',
    )
    // Automatic birthday greetings: the text, and who was greeted which year.
    await queryRunner.query('ALTER TABLE "businesses" ADD COLUMN "birthday_greeting" text')
    await queryRunner.query(`
      CREATE TABLE "birthday_greetings" (
        "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "phone" varchar(32) NOT NULL,
        "year" smallint NOT NULL,
        PRIMARY KEY ("business_id", "phone", "year")
      )
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "birthday_greetings"')
    await queryRunner.query('ALTER TABLE "businesses" DROP COLUMN "birthday_greeting"')
    await queryRunner.query('DROP TABLE "mailings"')
  }
}
