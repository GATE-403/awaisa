import type { MigrationInterface, QueryRunner } from 'typeorm'

// Funnels for every scenario, not only booking: each event names its flow and may carry short
// codes (`meta`: a field's name, a channel); one row per device holds its coarse profile, so a
// funnel can be read for phones with large text or slow networks. Earlier events were booking.
export class FunnelFlows1797900000000 implements MigrationInterface {
  name = 'FunnelFlows1797900000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "funnel_events" ADD "flow" varchar(20) NOT NULL DEFAULT 'booking', ADD "meta" jsonb`,
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_funnel_events_flow" ON "funnel_events" ("flow", "created_at")',
    )
    await queryRunner.query(`CREATE TABLE "funnel_sessions" (
      "session" varchar(40) PRIMARY KEY,
      "device" varchar(8) NOT NULL,
      "os" varchar(8) NOT NULL,
      "app" varchar(8) NOT NULL,
      "text_scale" varchar(8) NOT NULL,
      "net" varchar(8) NOT NULL,
      "lang" varchar(4) NOT NULL,
      "reduced_motion" boolean NOT NULL DEFAULT false,
      "contrast_more" boolean NOT NULL DEFAULT false,
      "dark" boolean NOT NULL DEFAULT false,
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_funnel_sessions_updated" ON "funnel_sessions" ("updated_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "funnel_sessions"')
    await queryRunner.query('DROP INDEX "IDX_funnel_events_flow"')
    await queryRunner.query('ALTER TABLE "funnel_events" DROP COLUMN "meta", DROP COLUMN "flow"')
  }
}
