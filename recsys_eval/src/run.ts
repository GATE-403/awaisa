import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { exportDb } from './data/exportDb.ts'
import { simulate } from './data/simulate.ts'
import { splitByTime } from './data/split.ts'
import { evaluate } from './evaluate.ts'
import { popular, popularInCategory, random, repeatPlaces } from './recommenders/baselines.ts'
import { production, productionNoExplore } from './recommenders/production.ts'
import { makePrototypes } from './recommenders/prototypes.ts'
import { type Section, toHtml, toMarkdown } from './report.ts'
import type { Dataset, Recommender } from './types.ts'

// `pnpm rec:eval` — export the local database (read-only, anonymised), simulate behaviour on
// its catalog, split both by time, run every recommender, write reports/latest.{md,html}.

const root = resolve(dirname(new URL(import.meta.url).pathname), '..', '..')
// `pnpm rec:eval -- --k=5` passes the `--` on: drop it.
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    source: { type: 'string', default: 'both' },
    k: { type: 'string', default: '10' },
    'db-test-days': { type: 'string', default: '14' },
    'sim-test-days': { type: 'string', default: '21' },
    clients: { type: 'string', default: '4000' },
    'save-export': { type: 'boolean', default: false },
  },
})

const k = Number(values.k)
const recommenders: Recommender[] = [
  random,
  popular,
  popularInCategory,
  repeatPlaces,
  production,
  productionNoExplore,
  ...makePrototypes(),
]

const envFile = join(root, '.env')
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile)
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Нет DATABASE_URL: нужен каталог из локальной базы (pnpm db:up && pnpm db:seed).')
  process.exit(1)
}

const outDir = join(root, 'recsys_eval', 'reports')
mkdirSync(outDir, { recursive: true })

console.log('Выгружаю локальную базу (только чтение, телефоны → хеш)…')
const db = await exportDb(databaseUrl)
if (values['save-export']) {
  const dataDir = join(root, 'recsys_eval', 'data')
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, 'db-export.json'), JSON.stringify(db))
}

const datasets: [Dataset, number][] = []
if (values.source !== 'sim') datasets.push([db, Number(values['db-test-days'])])
if (values.source !== 'db') {
  console.log('Симулирую поведение на каталоге…')
  datasets.push([
    simulate(db.items, { clients: Number(values.clients) }),
    Number(values['sim-test-days']),
  ])
}

const sections: Section[] = datasets.map(([dataset, testDays]) => {
  const split = splitByTime(dataset, testDays)
  console.log(`${dataset.source}: ${split.cases.length} клиентов в проверке, считаю…`)
  return { dataset, split, results: evaluate(split, recommenders, k), k }
})

const now = new Date()
writeFileSync(join(outDir, 'latest.md'), toMarkdown(sections, now))
writeFileSync(join(outDir, 'latest.html'), toHtml(sections, now))

for (const { dataset, results } of sections) {
  console.log(`\n${dataset.source}:`)
  console.table(
    results.map(({ recommender, overall }) => ({
      model: recommender,
      [`NDCG@${k}`]: Number(overall.ndcg.toFixed(3)),
      [`Hit@${k}`]: Number(overall.hit.toFixed(3)),
      coverage: Number(overall.coverage.toFixed(2)),
      bought: Number(overall.alreadyBought.toFixed(2)),
      newHit: Number(overall.hitNew.toFixed(3)),
    })),
  )
}
console.log(`\nОтчёт: ${join(outDir, 'latest.html')}`)
