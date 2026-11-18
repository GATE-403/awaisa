import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { exportDb } from '../data/exportDb.ts'
import { DAY_MS, splitByTime } from '../data/split.ts'
import { popularInCategory } from '../recommenders/baselines.ts'
import { previous, production } from '../recommenders/production.ts'
import type { Context, Recommender, User } from '../types.ts'
import { PERSONAS, type Persona, toUser } from './personas.ts'

// `pnpm rec:judge` — Claude rates each persona's shelf, card by card, 1–5 with a reason, without
// knowing which model made it. Only invented material goes out: the persona's portrait and
// history from personas.ts and the demo catalog's service names, places and prices. No client
// of the database is ever sent. The key comes from ANTHROPIC_API_KEY (environment or the root
// .env, never committed) or an `ant auth login` profile; without one, `--dry-run` writes the
// prompts so they can be read first.

const MODEL = 'claude-opus-5-5'
const K = 8

const root = resolve(dirname(new URL(import.meta.url).pathname), '..', '..', '..')
// `pnpm rec:judge -- --dry-run` passes the `--` on: drop it.
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { 'dry-run': { type: 'boolean', default: false } },
})

const Verdict = z.object({
  cards: z.array(
    z.object({
      number: z.number().int(),
      score: z.number().int().min(1).max(5),
      reason: z.string(),
    }),
  ),
  overall: z.number().int().min(1).max(5),
  comment: z.string(),
})
type Verdict = z.infer<typeof Verdict>

const SYSTEM = `Ты оцениваешь рекомендации сервиса записи к мастерам красоты и здоровья в Бишкеке.
Тебе дают портрет клиента, его прошлые визиты и ленту «Для вас» из нескольких услуг.
Оцени каждую карточку от 1 до 5: насколько вероятно, что этот человек захочет записаться на неё
в ближайшие две недели (5 — точно запишется, 3 — может заинтересовать, 1 — не подходит совсем).
Учитывай пол, возраст, бюджет, ритм визитов, привычные места. Причина — одно короткое предложение
по-русски. Затем общая оценка ленты 1–5 и одна фраза: чего в ней не хватает или что лишнее.`

const describeUser = (persona: Persona, user: User, context: Context) => {
  const visits = user.history.map((visit) => {
    const item = context.byId.get(visit.serviceId)
    const days = Math.round((context.now - visit.time) / DAY_MS)
    return `- ${item?.name} в «${item?.businessName}», ${days} дн. назад`
  })
  return [
    `Клиент: ${persona.portrait}`,
    visits.length ? `Прошлые визиты:\n${visits.join('\n')}` : 'Прошлых визитов в сервисе нет.',
    persona.stated
      ? 'Клиент ответил анкету «Для вас» (интересы, пол, бюджет).'
      : 'Анкету клиент не заполнял.',
  ].join('\n\n')
}

const describeList = (ids: string[], context: Context) =>
  ids
    .map((id, index) => {
      const item = context.byId.get(id)
      return `${index + 1}. ${item?.name} — «${item?.businessName}» (${item?.kind}), ${item?.price} сом`
    })
    .join('\n')

const envFile = join(root, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)
if (!process.env.DATABASE_URL) {
  console.error('Нет DATABASE_URL: нужен каталог из локальной базы (pnpm db:up && pnpm db:seed).')
  process.exit(1)
}

const db = await exportDb(process.env.DATABASE_URL)
// The catalog as it is now: everything before the latest visit is history.
const { context, train } = splitByTime(db, 0)
const judged: Recommender[] = [production, previous, popularInCategory]
for (const recommender of judged) recommender.prepare?.(context, train)

type Task = { persona: Persona; model: string; ids: string[]; prompt: string }
const tasks: Task[] = PERSONAS.flatMap((persona) => {
  const user = toUser(persona, context.items, context.now)
  return judged.map((recommender) => {
    const ids = recommender.recommend(user, context, K)
    return {
      persona,
      model: recommender.name,
      ids,
      prompt: `${describeUser(persona, user, context)}\n\nЛента «Для вас»:\n${describeList(ids, context)}`,
    }
  })
})

const outDir = join(root, 'recsys_eval', 'reports')
mkdirSync(outDir, { recursive: true })

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
if (values['dry-run'] || !hasKey) {
  const file = join(outDir, 'judge-prompts.md')
  writeFileSync(
    file,
    [
      `# Запросы к судье (${MODEL}), не отправлены`,
      '',
      '## Системная инструкция',
      '',
      SYSTEM,
      '',
      ...tasks.flatMap((task) => [
        `## ${task.persona.name} · ${task.model}`,
        '',
        '```',
        task.prompt,
        '```',
        '',
      ]),
    ].join('\n'),
  )
  console.log(
    hasKey
      ? `--dry-run: ${tasks.length} запросов записаны в ${file}`
      : `Нет ANTHROPIC_API_KEY: запросы записаны в ${file}. Добавьте ключ в корневой .env и запустите снова.`,
  )
  process.exit(0)
}

const client = new Anthropic()

const judge = async (task: Task): Promise<Verdict | { refused: string }> => {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    // A policy decline is unlikely here, but if it happens the request is re-run on a fallback.
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Verdict) },
    system: SYSTEM,
    messages: [{ role: 'user', content: task.prompt }],
  })
  if (response.stop_reason === 'refusal') {
    return { refused: response.stop_details?.explanation ?? 'refusal' }
  }
  if (!response.parsed_output) return { refused: `no output (${response.stop_reason})` }
  return response.parsed_output
}

const results: { task: Task; verdict: Verdict | { refused: string } }[] = []
for (const task of tasks) {
  try {
    results.push({ task, verdict: await judge(task) })
    console.log(`✓ ${task.persona.name} · ${task.model}`)
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Ключ не подошёл (401): проверьте ANTHROPIC_API_KEY.')
      process.exit(1)
    }
    if (error instanceof Anthropic.RateLimitError) {
      console.error('Лимит запросов (429): запустите позже.')
      process.exit(1)
    }
    throw error
  }
}

const mean = (values: number[]) =>
  values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0
const scoresOf = (model: string, personaFilter?: (persona: Persona) => boolean) =>
  results
    .filter(({ task }) => task.model === model && (personaFilter?.(task.persona) ?? true))
    .flatMap(({ verdict }) => ('cards' in verdict ? verdict.cards.map((card) => card.score) : []))

const isNew = (persona: Persona) => persona.history.length === 0
const lines = [
  `# Оценка лент судьёй ${MODEL}`,
  '',
  `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · персоны из docs/ux-testing/personas.md · по ${K} карточек · судья не знает, какая модель собрала ленту. Все данные синтетические.`,
  '',
  '| Модель | Средняя карточка | Постоянные | Новые | Общая оценка ленты |',
  '|---|---|---|---|---|',
  ...judged.map((recommender) => {
    const overall = results
      .filter(({ task }) => task.model === recommender.name)
      .flatMap(({ verdict }) => ('overall' in verdict ? [verdict.overall] : []))
    return `| ${recommender.name} | ${mean(scoresOf(recommender.name)).toFixed(2)} | ${mean(scoresOf(recommender.name, (persona) => !isNew(persona))).toFixed(2)} | ${mean(scoresOf(recommender.name, isNew)).toFixed(2)} | ${mean(overall).toFixed(2)} |`
  }),
  '',
  ...results.flatMap(({ task, verdict }) => [
    `## ${task.persona.name} · ${task.model}`,
    '',
    ...('refused' in verdict
      ? [`Нет оценки: ${verdict.refused}`]
      : [
          `Лента: **${verdict.overall}/5** — ${verdict.comment}`,
          '',
          ...task.ids.map((id, index) => {
            const item = context.byId.get(id)
            const card = verdict.cards.find((entry) => entry.number === index + 1)
            return `${index + 1}. ${item?.name} («${item?.businessName}», ${item?.price} сом) — **${card?.score ?? '—'}** · ${card?.reason ?? ''}`
          }),
        ]),
    '',
  ]),
]
const file = join(outDir, 'judge.md')
writeFileSync(file, lines.join('\n'))
console.log(`\nОтчёт судьи: ${file}`)
