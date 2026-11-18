import type { MigrationInterface, QueryRunner } from 'typeorm'

// Each answer of GET /recommendations gets an id and the scorer's version, carried by every
// event it leads to: the shown list can be put back together in order (request + position),
// versions compared, and a booking credited to the exact shelf that led to it.
export class RecommendationRequests1798000000000 implements MigrationInterface {
  name = 'RecommendationRequests1798000000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recommendation_events" ADD "request_id" uuid, ADD "algorithm" varchar(24),
         ADD "booking_id" uuid`,
    )
    await queryRunner.query(
      'CREATE INDEX "IDX_recommendation_events_request" ON "recommendation_events" ("request_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_recommendation_events_request"')
    await queryRunner.query(
      'ALTER TABLE "recommendation_events" DROP COLUMN "booking_id", DROP COLUMN "algorithm", DROP COLUMN "request_id"',
    )
  }
}
