import { defineConfig } from 'vitest/config'

// Tests of the SQL that picks rows for the cron jobs, against a real Postgres: a database of
// their own (`<name>_dbtest`), made fresh and migrated by the global setup. `pnpm test:db`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.db-spec.ts'],
    globalSetup: ['src/database/testing/dbGlobalSetup.ts'],
    // One database for every file: they truncate the same tables.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
})
