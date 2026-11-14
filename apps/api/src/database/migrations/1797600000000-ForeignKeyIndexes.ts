import type { MigrationInterface, QueryRunner } from 'typeorm'

// Postgres does not index foreign keys by itself: without these, joins and lookups by the key
// scan the table, and deleting a parent row (a branch, a service) scans every child table.
// Plain CREATE INDEX is fine while tables are small; on a large live table, build indexes
// CONCURRENTLY outside a migration instead.
const INDEXES: [name: string, definition: string][] = [
  // Analytics, the schedule and the cabinet read a business's bookings by time.
  ['bookings_business_starts_at_idx', '"bookings" ("business_id", "starts_at")'],
  // Recommendations, popular services and return visits count bookings per service.
  ['bookings_service_starts_at_idx', '"bookings" ("service_id", "starts_at")'],
  ['bookings_branch_idx', '"bookings" ("branch_id")'],
  ['bookings_promotion_idx', '"bookings" ("promotion_id") WHERE "promotion_id" IS NOT NULL'],
  ['services_category_idx', '"services" ("category_id")'],
  ['specialist_services_service_idx', '"specialist_services" ("service_id")'],
  ['specialists_branch_idx', '"specialists" ("branch_id") WHERE "branch_id" IS NOT NULL'],
  // «The newest visible photo of this service» for every catalog and recommendation card.
  [
    'work_photos_service_created_idx',
    '"work_photos" ("service_id", "created_at" DESC) WHERE NOT "is_hidden"',
  ],
  [
    'work_photos_specialist_idx',
    '"work_photos" ("specialist_id") WHERE "specialist_id" IS NOT NULL',
  ],
  ['work_photos_booking_idx', '"work_photos" ("booking_id") WHERE "booking_id" IS NOT NULL'],
  ['sessions_customer_idx', '"sessions" ("customer_id")'],
  ['waitlist_entries_business_idx', '"waitlist_entries" ("business_id")'],
  ['waitlist_entries_customer_idx', '"waitlist_entries" ("customer_id")'],
  ['business_questions_customer_idx', '"business_questions" ("customer_id")'],
  ['telegram_chats_customer_idx', '"telegram_chats" ("customer_id")'],
  ['telegram_link_codes_business_idx', '"telegram_link_codes" ("business_id")'],
  ['stock_items_business_idx', '"stock_items" ("business_id")'],
  ['stock_movements_item_idx', '"stock_movements" ("item_id")'],
  ['service_materials_item_idx', '"service_materials" ("item_id")'],
  ['subscription_plans_business_idx', '"subscription_plans" ("business_id")'],
  ['client_subscriptions_plan_idx', '"client_subscriptions" ("plan_id")'],
  ['subscription_uses_subscription_idx', '"subscription_uses" ("subscription_id")'],
  ['certificate_uses_certificate_idx', '"certificate_uses" ("certificate_id")'],
  ['certificate_uses_booking_idx', '"certificate_uses" ("booking_id")'],
]

export class ForeignKeyIndexes1797600000000 implements MigrationInterface {
  name = 'ForeignKeyIndexes1797600000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, definition] of INDEXES) {
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "${name}" ON ${definition}`)
    }
    // (business_id, starts_at) answers everything the single-column index did.
    await queryRunner.query('DROP INDEX IF EXISTS "bookings_business_idx"')
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "bookings_business_idx" ON "bookings" ("business_id")',
    )
    for (const [name] of INDEXES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${name}"`)
    }
  }
}
