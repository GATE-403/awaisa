import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Telemetry1797500000000 implements MigrationInterface {
  name = 'Telemetry1797500000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // The booking funnel: one row per step a device session reached.
    await queryRunner.query(`CREATE TABLE "funnel_events" (
      "id" bigserial PRIMARY KEY,
      "session" varchar(40) NOT NULL,
      "step" varchar(20) NOT NULL,
      "slug" varchar(64),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_funnel_events_created" ON "funnel_events" ("created_at", "step")',
    )
    // Errors seen in browsers and unexpected API failures, kept 90 days.
    await queryRunner.query(`CREATE TABLE "app_errors" (
      "id" bigserial PRIMARY KEY,
      "source" varchar(8) NOT NULL,
      "message" varchar(500) NOT NULL,
      "stack" text NOT NULL DEFAULT '',
      "url" varchar(500) NOT NULL DEFAULT '',
      "session" varchar(40),
      "user_agent" varchar(300) NOT NULL DEFAULT '',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query('CREATE INDEX "IDX_app_errors_created" ON "app_errors" ("created_at")')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "app_errors"')
    await queryRunner.query('DROP TABLE "funnel_events"')
  }
}
