import type { Split } from './data/split.ts'
import type { Result, Summary } from './evaluate.ts'
import type { Dataset } from './types.ts'

// The report as Markdown (for the PR and docs) and as one self-contained HTML page.

type Section = { dataset: Dataset; split: Split; results: Result[]; k: number }

const percent = (value: number) => `${(value * 100).toFixed(1)}%`
const fixed = (value: number, digits = 3) => value.toFixed(digits)
const interval = ([low, high]: readonly [number, number], format: (value: number) => string) =>
  `${format(low)}–${format(high)}`

const day = (time: number) => new Date(time).toISOString().slice(0, 10)

const mainRows = (results: Result[]) =>
  results.map(({ recommender, overall: s, millisPerUser }) => [
    recommender,
    `${fixed(s.ndcg)} (${interval(s.ndcgInterval, fixed)})`,
    `${percent(s.hit)} (${interval(s.hitInterval, percent)})`,
    fixed(s.precision),
    fixed(s.recall),
    fixed(s.ap),
    percent(s.coverage),
    fixed(s.diversity, 2),
    fixed(s.novelty, 2),
    percent(s.alreadyBought),
    `${percent(s.hitNew)} (n=${s.newUsers})`,
    millisPerUser.toFixed(2),
  ])

const MAIN_HEAD = (k: number) => [
  'Модель',
  `NDCG@${k} (95% ДИ)`,
  `HitRate@${k} (95% ДИ)`,
  `P@${k}`,
  `R@${k}`,
  `MAP@${k}`,
  'Покрытие',
  'Разнообр.',
  'Новизна',
  'Уже покупал',
  `Hit новое@${k}`,
  'мс/клиент',
]

const segmentNames = (results: Result[]) =>
  [...new Set(results.flatMap((result) => Object.keys(result.segments)))].sort()

const segmentRows = (results: Result[]) => {
  const names = segmentNames(results)
  return {
    head: [
      'Модель',
      ...names.map((name) => `${name} (n=${results[0]?.segments[name]?.users ?? 0})`),
    ],
    rows: results.map((result) => [
      result.recommender,
      ...names.map((name) => {
        const s: Summary | undefined = result.segments[name]
        return s ? `${fixed(s.ndcg)} / ${percent(s.hit)}` : '—'
      }),
    ]),
  }
}

const markdownTable = (head: string[], rows: string[][]) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')

const splitLine = ({ dataset, split }: Section) =>
  `Срез ${day(split.cutoff)}: обучение — ${split.train.length} визитов до него, проверка — ` +
  `${split.cases.length} клиентов, записавшихся за ${split.testDays} дн. после. ` +
  `Каталог: ${dataset.items.length} услуг.`

const CAVEATS = [
  'Расстояние, «свободно сегодня» и акции в прошлом неизвестны: эти части формулы одинаковы для всех кандидатов и порядок не меняют. Онлайн они работают, офлайн их не оценить.',
  'Рейтинг места — среднее отзывов до среза (в проде — средний рейтинг мастеров).',
  'Нет «уже показано» (seen): истории показов по клиентам в прошлом нет.',
  'Релевантно всё, что клиент записал после среза, включая повторы: для записи к мастеру повтор — нормальный исход, поэтому есть колонка «Уже покупал».',
  'Разнообразие — доля пар карточек разного типа услуг (стрижка, ногти…); новизна — средняя −log2 доли записей услуги до среза.',
]

const toMarkdown = (sections: Section[], generatedAt: Date) =>
  [
    '# Офлайн-оценка рекомендаций «Для вас»',
    '',
    `Собрано ${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC командой \`pnpm rec:eval\`. Все данные синтетические.`,
    '',
    ...sections.flatMap((section) => {
      const segments = segmentRows(section.results)
      return [
        `## Данные: ${section.dataset.source === 'db' ? 'демо-база' : 'симуляция'}`,
        '',
        `> ${section.dataset.note}`,
        '',
        splitLine(section),
        '',
        markdownTable(MAIN_HEAD(section.k), mainRows(section.results)),
        '',
        `### По сегментам (NDCG@${section.k} / HitRate@${section.k})`,
        '',
        markdownTable(segments.head, segments.rows),
        '',
        ...section.results.map((result) => `- **${result.recommender}** — ${result.description}`),
        '',
      ]
    }),
    '## Оговорки',
    '',
    ...CAVEATS.map((line) => `- ${line}`),
    '',
  ].join('\n')

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const htmlTable = (head: string[], rows: string[][]) =>
  `<div class="scroll"><table><thead><tr>${head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`

const bars = (results: Result[], k: number) => {
  const top = Math.max(...results.map((result) => result.overall.ndcg), 0.0001)
  return `<div class="bars" role="img" aria-label="NDCG@${k} по моделям">${results
    .map(
      (result) =>
        `<div class="bar"><span>${escapeHtml(result.recommender)}</span><i style="width:${(result.overall.ndcg / top) * 100}%"></i><b>${fixed(result.overall.ndcg)}</b></div>`,
    )
    .join('')}</div>`
}

const toHtml = (sections: Section[], generatedAt: Date) => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Оценка рекомендаций</title>
<style>
:root{--bg:#f5f5f7;--card:#fff;--fg:#1d1d1f;--muted:#6e6e73;--accent:#0071e3;--line:rgba(0,0,0,.1)}
@media (prefers-color-scheme:dark){:root{--bg:#000;--card:#1c1c1e;--fg:#f5f5f7;--muted:#98989d;--accent:#0a84ff;--line:rgba(255,255,255,.15)}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,system-ui,Inter,sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px}
section{background:var(--card);border-radius:20px;padding:20px;margin:16px 0}
h1{font-size:28px;letter-spacing:-.02em}h2{font-size:22px;margin-top:0}h3{font-size:17px}
.note{color:var(--muted)}.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:13px}
th,td{text-align:left;padding:6px 8px;border-bottom:.5px solid var(--line);white-space:nowrap}
th{color:var(--muted);font-weight:600}
.bars{display:grid;gap:6px;margin:12px 0}.bar{display:grid;grid-template-columns:160px 1fr 60px;align-items:center;gap:8px;font-size:13px}
.bar i{display:block;height:10px;border-radius:5px;background:var(--accent)}
</style></head><body><main>
<h1>Офлайн-оценка рекомендаций «Для вас»</h1>
<p class="note">Собрано ${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC. Все данные синтетические.</p>
${sections
  .map((section) => {
    const segments = segmentRows(section.results)
    return `<section><h2>Данные: ${section.dataset.source === 'db' ? 'демо-база' : 'симуляция'}</h2>
<p class="note">${escapeHtml(section.dataset.note)}</p><p>${escapeHtml(splitLine(section))}</p>
${bars(section.results, section.k)}
${htmlTable(MAIN_HEAD(section.k), mainRows(section.results))}
<h3>По сегментам (NDCG@${section.k} / HitRate@${section.k})</h3>
${htmlTable(segments.head, segments.rows)}
<ul>${section.results.map((result) => `<li><b>${escapeHtml(result.recommender)}</b> — ${escapeHtml(result.description)}</li>`).join('')}</ul></section>`
  })
  .join('\n')}
<section><h2>Оговорки</h2><ul>${CAVEATS.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul></section>
</main></body></html>
`

export type { Section }
export { toHtml, toMarkdown }
