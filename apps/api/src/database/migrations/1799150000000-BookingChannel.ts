import type { MigrationInterface, QueryRunner } from 'typeorm'

// Where an online booking came from (the catalog, «Для вас», «Образы», search, the map or the
// salon's own link), for the strategy numbers in «Воронки». Older bookings stay null.
export class BookingChannel1799150000000 implements MigrationInterface {
  name = 'BookingChannel1799150000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "bookings" ADD "channel" varchar(16)')
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_online_created" ON "bookings" ("created_at") WHERE "source" = 'online'`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_bookings_online_created"')
    await queryRunner.query('ALTER TABLE "bookings" DROP COLUMN "channel"')
  }
}
