import type { MigrationInterface, QueryRunner } from 'typeorm'

export class PaymentCheckoutUrl1795600000000 implements MigrationInterface {
  name = 'PaymentCheckoutUrl1795600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    // The acquirer's own payment page, so the client can come back to it from the ticket.
    await queryRunner.query('ALTER TABLE "payments" ADD COLUMN "checkout_url" text')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "payments" DROP COLUMN "checkout_url"')
  }
}
