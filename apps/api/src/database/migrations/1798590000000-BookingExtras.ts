import type { MigrationInterface, QueryRunner } from 'typeorm'

// Several services in one visit (manicure and pedicure, a haircut and a beard): the booking keeps
// its first service in `service_id` and one time span, so `bookings_no_overlap` still guards the
// master's day; the services added after the first are rows here, in the order they are done.
export class BookingExtras1798590000000 implements MigrationInterface {
  name = 'BookingExtras1798590000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "booking_extras" (
        "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
        "position" smallint NOT NULL,
        "service_id" varchar(64) NOT NULL REFERENCES "services"("id"),
        PRIMARY KEY ("booking_id", "position")
      )`)
    await queryRunner.query(
      'CREATE INDEX "IDX_booking_extras_service" ON "booking_extras" ("service_id")',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "booking_extras"')
  }
}
