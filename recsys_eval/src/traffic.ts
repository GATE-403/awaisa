import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import pg from 'pg'

// `pnpm rec:traffic` - the shelves' real traffic from `recommendation_events` (read-only: device
// sessions are counted, never read out) and, from it, how long the tests in
// docs/recsys/experiments.md would take. Point DATABASE_URL at a read replica or an export to
// read production; locally it counts whatever e2e runs and your own clicks left.

const root = resolve(dirname(new URL(import.meta.url).pathname), '..', '..')
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { days: { type: 'string', default: '14' } },
})
const days = Number(values.days)

const envFile = join(root, '.env')
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile)
if (!process.env.DATABASE_URL) {
  console.error('Нет DATABASE_URL.')
  process.exit(1)
}

const Z_ALPHA = 1.96
const Z_POWER = 0.84

/** Sessions per variant to tell p from p·(1 + lift): two proportions, α 0.05, power 80%. */
const perVariant = (p: number, lift: number) => {
  const q = p * (1 + lift)
  return Math.ceil(((Z_ALPHA + Z_POWER) ** 2 * (p * (1 - p) + q * (1 - q))) / (q - p) ** 2)
}

/** Sessions with a tap for team-draft to tell a 55/45 split from 50/50 (sign test). */
const interleavingSessions = (share = 0.55) =>
  Math.ceil((Z_ALPHA * 0.5 + Z_POWER * Math.sqrt(share * (1 - share))) ** 2 / (share - 0.5) ** 2)

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
await client.query('BEGIN READ ONLY')
const { rows } = await client.query(
  `SELECT ("created_at" AT TIME ZONE 'UTC' + interval '6 hours')::date::text AS "day",
     COALESCE("algorithm", '-') AS "algorithm",
     COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'impression')::int AS "shown",
     COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'click')::int AS "tapped",
     COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'book')::int AS "booked"
   FROM "recommendation_events"
   WHERE "created_at" > now() - make_interval(days => $1)
   GROUP BY 1, 2 ORDER BY 1, 2`,
  [days],
)
const totals = await client.query(
  `SELECT COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'impression')::int AS "shown",
     COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'click')::int AS "tapped",
     COUNT(DISTINCT "session") FILTER (WHERE "kind" = 'book')::int AS "booked",
     COUNT(DISTINCT ("created_at" AT TIME ZONE 'UTC' + interval '6 hours')::date)::int AS "activeDays"
   FROM "recommendation_events" WHERE "created_at" > now() - make_interval(days => $1)`,
  [days],
)
await client.query('COMMIT')
await client.end()

const total = totals.rows[0] as {
  shown: number
  tapped: number
  booked: number
  activeDays: number
}
const perDay = total.activeDays ? total.shown / total.activeDays : 0
const ctr = total.shown ? total.tapped / total.shown : 0
const bookRate = total.shown ? total.booked / total.shown : 0
const percent = (value: number) => `${(value * 100).toFixed(2)}%`
const duration = (sessions: number) =>
  perDay > 0 ? `${Math.ceil(sessions / perDay)} дн.` : 'не дождаться'

const tests = [
  { name: 'CTR +20%', sessions: ctr > 0 ? perVariant(ctr, 0.2) * 2 : Number.NaN },
  { name: 'CTR +10%', sessions: ctr > 0 ? perVariant(ctr, 0.1) * 2 : Number.NaN },
  {
    name: 'Записи с полки +20%',
    sessions: bookRate > 0 ? perVariant(bookRate, 0.2) * 2 : Number.NaN,
  },
  {
    name: 'Interleaving 55/45 по нажатиям',
    sessions: ctr > 0 ? Math.ceil(interleavingSessions() / ctr) : Number.NaN,
  },
]

const lines = [
  `# Трафик полок «Для вас» за ${days} дн.`,
  '',
  `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · база: ${new URL(process.env.DATABASE_URL).hostname}. Локальная база - это прогоны e2e и ваши клики, не клиенты.`,
  '',
  `Сессий с показом: **${total.shown}** за ${total.activeDays} активных дн. (≈ ${Math.round(perDay)} в день) · с нажатием: ${total.tapped} (${percent(ctr)}) · с записью: ${total.booked} (${percent(bookRate)}).`,
  '',
  '| Проверка | Сессий с показом на весь тест | При нынешнем трафике |',
  '|---|---|---|',
  ...tests.map((test) =>
    Number.isNaN(test.sessions)
      ? `| ${test.name} | нет данных (0 событий) | - |`
      : `| ${test.name} | ${test.sessions.toLocaleString('ru-RU')} | ${duration(test.sessions)} |`,
  ),
  '',
  'Расчёт: две доли, α = 0.05, мощность 80%, два варианта поровну; interleaving - знаковый тест. Не меньше двух полных недель в любом случае (docs/recsys/experiments.md).',
  '',
  '## По дням и версиям',
  '',
  '| День | Версия | Показ | Нажатие | Запись |',
  '|---|---|---|---|---|',
  ...rows.map(
    (row) => `| ${row.day} | ${row.algorithm} | ${row.shown} | ${row.tapped} | ${row.booked} |`,
  ),
  '',
]

const outDir = join(root, 'recsys_eval', 'reports')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'traffic.md'), lines.join('\n'))
console.log(lines.slice(0, 13).join('\n'))
console.log(`\nОтчёт: ${join(outDir, 'traffic.md')}`)
