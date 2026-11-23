import type { MigrationInterface, QueryRunner } from 'typeorm'

// «Хочу так» on a work in the catalog: the booking keeps the photo the client wants to look like,
// so the master sees it beside the visit. Deleting the photo lets go of it (the url stays unread).
export class BookingLookPhoto1799300000000 implements MigrationInterface {
  name = 'BookingLookPhoto1799300000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "bookings" ADD "look_photo_id" uuid REFERENCES "work_photos"("id") ON DELETE SET NULL',
    )
    await queryRunner.query('ALTER TABLE "bookings" ADD "look_photo_url" varchar(500)')
    await queryRunner.query(
      'CREATE INDEX "IDX_bookings_look_photo" ON "bookings" ("look_photo_id") WHERE "look_photo_id" IS NOT NULL',
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_bookings_look_photo"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "look_photo_url"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "look_photo_id"')
  }
}
