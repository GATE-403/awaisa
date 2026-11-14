import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RecommendationSignals1796500000000 implements MigrationInterface {
  name = 'RecommendationSignals1796500000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // «After kind A clients book kind B»: recomputed nightly from bookings.
    await queryRunner.query(`CREATE TABLE "kind_affinities" (
      "from_kind" varchar(16) NOT NULL,
      "to_kind" varchar(16) NOT NULL,
      "lift" double precision NOT NULL,
      "support" integer NOT NULL,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("from_kind", "to_kind")
    )`)
    // What the shelves showed and what was tapped and booked, per device session.
    await queryRunner.query(`CREATE TABLE "recommendation_events" (
      "id" bigserial PRIMARY KEY,
      "session" varchar(40) NOT NULL,
      "customer_id" uuid,
      "kind" varchar(12) NOT NULL,
      "service_id" varchar(64) NOT NULL,
      "reason" varchar(80) NOT NULL DEFAULT '',
      "surface" varchar(16) NOT NULL,
      "position" smallint,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`)
    await queryRunner.query(
      'CREATE INDEX "recommendation_events_session" ON "recommendation_events" ("session", "created_at")',
    )
    await queryRunner.query(
      'CREATE INDEX "recommendation_events_created" ON "recommendation_events" ("created_at")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "recommendation_events"')
    await queryRunner.query('DROP TABLE "kind_affinities"')
  }
}
