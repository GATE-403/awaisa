import type { MigrationInterface, QueryRunner } from 'typeorm'

// The Expo app's own pushes: its token (`ExponentPushToken[…]`) lives in the same table as a
// browser's subscription, told apart by `kind`; it has no encryption keys.
export class ExpoPushTokens1798570000000 implements MigrationInterface {
  name = 'ExpoPushTokens1798570000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions"
         ADD COLUMN "kind" varchar(8) NOT NULL DEFAULT 'web',
         ADD CONSTRAINT "CHK_push_subscriptions_kind" CHECK ("kind" IN ('web', 'expo')),
         ALTER COLUMN "p256dh" DROP NOT NULL,
         ALTER COLUMN "auth" DROP NOT NULL`,
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "push_subscriptions" WHERE "kind" = 'expo'`)
    await queryRunner.query(
      `ALTER TABLE "push_subscriptions"
         DROP CONSTRAINT "CHK_push_subscriptions_kind",
         DROP COLUMN "kind",
         ALTER COLUMN "p256dh" SET NOT NULL,
         ALTER COLUMN "auth" SET NOT NULL`,
    )
  }
}
