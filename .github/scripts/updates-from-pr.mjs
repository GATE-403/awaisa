// Copies a merged PR's «## What's new» section into apps/web/src/shared/config/updates.json, the
// entries «Что нового» (/updates) shows next to the hand-written ones. One line per entry:
//
//   - For business: Заголовок - Текст в одно-два предложения. [Попробовать](/manage)
//
// Audience: «For clients», «For business» or «For everyone». The title, text and link label are
// shown in the app as written, so they stay in Russian, the app's language; the rest of the PR
// description is English. The link is optional and must be a path on the site. «- none», an
// empty section or no section adds nothing. Older Russian descriptions («## Что нового», «Для
// клиентов», «- нет») still parse. Run by the updates workflow with PR_NUMBER, PR_BODY and
// MERGED_AT in the environment; `parseSection` is exported for tests.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILE = 'apps/web/src/shared/config/updates.json'

const AUDIENCES = {
  'for clients': 'clients',
  'for business': 'business',
  'for everyone': 'everyone',
  'для клиентов': 'clients',
  'для бизнеса': 'business',
  'для всех': 'everyone',
}

const ENTRY =
  /^[-*]\s+(For clients|For business|For everyone|Для клиентов|Для бизнеса|Для всех)\s*:\s*(.+?)\s+[-\u2013\u2014]\s+(.+)$/i
const LINK = /\s*\[([^\]]+)\]\((\/[^)\s]*)\)\s*$/

const section = (body) => {
  const lines = body.replace(/\r/g, '').split('\n')
  const start = lines.findIndex((line) => /^#{2,3}\s*(What's new|Что нового)\s*$/i.test(line.trim()))
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^#{1,3}\s/.test(line.trim()))
  return (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).filter(Boolean)
}

const parseSection = (body, { number, date }) => {
  const entries = []
  for (const line of section(body ?? '')) {
    if (line.startsWith('<!--')) continue
    const match = ENTRY.exec(line)
    if (!match) continue
    const [, audience, title, tail] = match
    const link = LINK.exec(tail)
    const text = (link ? tail.slice(0, link.index) : tail).trim()
    entries.push({
      id: `pr${number}-${entries.length + 1}`,
      date,
      audience: AUDIENCES[audience.toLowerCase()],
      title: title.trim(),
      text,
      ...(link ? { link: { href: link[2], label: link[1] } } : {}),
    })
  }
  return entries
}

// Bishkek's day (UTC+6), like everything else the site dates.
const toDayKey = (iso) => new Date(Date.parse(iso) + 6 * 3_600_000).toISOString().slice(0, 10)

const main = () => {
  const number = Number(process.env.PR_NUMBER)
  const date = toDayKey(process.env.MERGED_AT ?? new Date().toISOString())
  const added = parseSection(process.env.PR_BODY ?? '', { number, date })
  if (added.length === 0) {
    process.stdout.write(`#${number}: no «Что нового» entries\n`)
    return
  }
  const current = JSON.parse(readFileSync(FILE, 'utf8'))
  const kept = current.filter((entry) => !entry.id.startsWith(`pr${number}-`))
  writeFileSync(FILE, `${JSON.stringify([...added, ...kept], null, 2)}\n`)
  process.stdout.write(`#${number}: ${added.length} «Что нового» entries\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()

export { parseSection, toDayKey }
