import type { MigrationInterface, QueryRunner } from 'typeorm'

// Query statistics for `pnpm --filter api db:slow`. Managed databases may refuse the extension
// or not preload its library; a missing extension must never block a deploy, so it is optional.
export class QueryStats1797700000000 implements MigrationInterface {
  name = 'QueryStats1797700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_stat_statements not available: %', SQLERRM;
      END $$`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS pg_stat_statements')
  }
}
