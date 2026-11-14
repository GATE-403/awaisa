// The queries that cost the database the most time since the statistics were last reset.
// Run: pnpm --filter api db:slow [-- --reset]  (reads DATABASE_URL from the root .env).
// Needs pg_stat_statements: preloaded by docker-compose's Postgres, enabled by a migration.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const ROOT_ENV = join(import.meta.dirname, '../../../.env')
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

const LIMIT = 15

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  if (process.argv.includes('--reset')) {
    await client.query('SELECT pg_stat_statements_reset()')
    process.stdout.write('Statistics reset.\n')
  } else {
    const { rows } = await client.query(
      `SELECT calls, round(total_exec_time)::int AS total_ms, round(mean_exec_time::numeric, 1) AS mean_ms,
              round(max_exec_time)::int AS max_ms, rows,
              regexp_replace(query, '\\s+', ' ', 'g') AS query
       FROM pg_stat_statements
       WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
         AND query NOT ILIKE '%pg_stat_statements%'
       ORDER BY total_exec_time DESC LIMIT $1`,
      [LIMIT],
    )
    for (const row of rows) {
      process.stdout.write(
        `\n${row.total_ms} ms total · ${row.calls} calls · ${row.mean_ms} ms avg · ${row.max_ms} ms max · ${row.rows} rows\n` +
          `  ${String(row.query).slice(0, 400)}\n`,
      )
    }
  }
} finally {
  await client.end()
}
