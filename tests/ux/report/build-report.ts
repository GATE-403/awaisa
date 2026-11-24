import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'

// Builds reports/ux/index.html from reports/ux/results.json. Self-contained (Node built-ins
// only) so it runs both from the Playwright reporter and on its own: `pnpm test:ux:report`.

type Finding = {
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  rule: string
  title: string
  detail?: string
  wcag?: string
  step: string
  url: string
  target?: string
  name?: string
  classes: string[]
  files: string[]
  screenshot?: string
}

type Row = {
  persona: string
  personaName: string
  device: string
  deviceLabel: string
  flow: string
  flowTitle: string
  project: string
  status: 'pass' | 'warn' | 'fail' | 'broken'
  error?: string
  durationMs: number
  findings: Finding[]
  steps: {
    name: string
    url: string
    screenshot: string
    vision: { type: string; path: string }[]
  }[]
  metrics: {
    interactiveMs?: number
    flowMs?: number
    actions: number
    fields: number
    budgets: { interactiveMs?: number; flowMs?: number; actions?: number; fields?: number }
  }
}

const SEVERITIES = ['critical', 'serious', 'moderate', 'minor'] as const
const SEVERITY_TEXT = {
  critical: 'Критично',
  serious: 'Серьёзно',
  moderate: 'Умеренно',
  minor: 'Мелочь',
}
const STATUS_TEXT = { pass: 'Пройден', warn: 'Замечания', fail: 'Проблемы', broken: 'Не пройден' }

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const walk = (dir: string, match: (path: string) => boolean, out: string[] = []) => {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.next')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, match, out)
    else if (match(path)) out.push(path)
  }
  return out
}

// Production CSS modules are «<hash>_<class>»: match each hash to the source .module.css whose
// class names it carries, so a finding on «vqWx5G_card» links to the file that styles it.
const buildClassMap = (root: string) => {
  const built = new Map<string, Set<string>>()
  const chunks = join(root, 'apps/web/.next-ux/static')
  for (const file of walk(chunks, (path) => path.endsWith('.css')))
    for (const [, hash, local] of readFileSync(file, 'utf8').matchAll(
      /\.([A-Za-z0-9_-]{6})_([A-Za-z][\w-]*)/g,
    )) {
      const set = built.get(hash) ?? new Set<string>()
      set.add(local)
      built.set(hash, set)
    }
  const sources = [join(root, 'apps/web/src'), join(root, 'packages/ui/src')].flatMap((dir) =>
    walk(dir, (path) => path.endsWith('.module.css')).map((path) => {
      const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      return {
        path: relative(root, path),
        locals: new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1])),
      }
    }),
  )
  const map = new Map<string, string>()
  for (const [hash, locals] of built) {
    let best = { path: '', score: 0 }
    for (const source of sources) {
      let common = 0
      for (const local of locals) if (source.locals.has(local)) common += 1
      const score = common / Math.max(locals.size, source.locals.size)
      if (score > best.score) best = { path: source.path, score }
    }
    if (best.score >= 0.5) map.set(hash, best.path)
  }
  return map
}

const componentOf = (root: string, cssPath: string) => {
  const tsx = cssPath.replace(/\.module\.css$/, '.tsx')
  return existsSync(join(root, tsx)) ? tsx : cssPath
}

const resolveFiles = (root: string, classMap: Map<string, string>, finding: Finding) => {
  const fromClasses: string[] = []
  for (const name of finding.classes) {
    const path = classMap.get(name.slice(0, 6))
    if (!path) continue
    for (const file of [componentOf(root, path), path])
      if (!fromClasses.includes(file)) fromClasses.push(file)
    if (fromClasses.length >= 4) break
  }
  return { exact: fromClasses, step: finding.files.filter((file) => !fromClasses.includes(file)) }
}

const fileLinks = (root: string, files: string[]) =>
  files
    .map(
      (file) =>
        `<a href="${escapeHtml(relative(join(root, 'reports/ux'), join(root, file)))}">${escapeHtml(file)}</a> <a class="vs" href="vscode://file/${escapeHtml(join(root, file))}" title="Открыть в VS Code">↗</a>`,
    )
    .join('<br>')

const ms = (value?: number) => (value === undefined ? '-' : `${(value / 1000).toFixed(1)} с`)

const metric = (label: string, value: string, budget: string | undefined, isOver: boolean) =>
  `<span class="metric${isOver ? ' over' : ''}">${escapeHtml(label)}: <b>${escapeHtml(value)}</b>${budget ? ` <small>/ ${escapeHtml(budget)}</small>` : ''}</span>`

type ManualFinding = Finding & {
  personas: string[]
  devices: string
  flow: string
  foundBy: string
}

// Problems people spotted while reading the report or testing by hand; they sit among the
// automatic ones with their own screenshot from tests/ux/report/manual/.
const readManualFindings = (root: string, outputDir: string) => {
  const path = join(root, 'tests/ux/report/manual-findings.json')
  if (!existsSync(path)) return []
  const items = JSON.parse(readFileSync(path, 'utf8')) as ManualFinding[]
  mkdirSync(join(outputDir, 'shots'), { recursive: true })
  return items.map((item) => {
    let screenshot: string | undefined
    const source = item.screenshot && join(root, 'tests/ux/report', item.screenshot)
    if (source && existsSync(source)) {
      screenshot = `shots/manual-${item.screenshot?.split('/').pop()}`
      copyFileSync(source, join(outputDir, screenshot))
    }
    const { personas, devices, flow, foundBy, ...finding } = item
    return {
      finding: { ...finding, classes: [], files: item.files ?? [] },
      screenshot,
      files: { exact: item.files ?? [], step: [] },
      manual: { personas, devices, flow, foundBy },
    }
  })
}

const buildReport = (outputDir: string) => {
  const root = resolve(outputDir, '../..')
  const resultsPath = join(outputDir, 'results.json')
  if (!existsSync(resultsPath)) throw new Error(`No ${resultsPath}: run pnpm test:ux first`)
  const { generatedAt, rows } = JSON.parse(readFileSync(resultsPath, 'utf8')) as {
    generatedAt: string
    rows: Row[]
  }
  const classMap = buildClassMap(root)

  const projects = [...new Map(rows.map((row) => [row.project, row])).values()].sort((a, b) =>
    a.project.localeCompare(b.project),
  )
  const flowTitles = [...new Set(rows.map((row) => row.flowTitle))]
  const anchor = (row: Row) => `t-${row.project}-${row.flowTitle}`.replace(/[^\w-]+/g, '-')

  // 1. Persona × flow × status.
  const matrix = `<table class="matrix"><thead><tr><th>Сценарий</th>${projects
    .map(
      (p) =>
        `<th><span class="who">${escapeHtml(p.personaName)}</span><br><small>${escapeHtml(p.deviceLabel)}</small></th>`,
    )
    .join('')}</tr></thead><tbody>${flowTitles
    .map(
      (title) =>
        `<tr><th>${escapeHtml(title)}</th>${projects
          .map((project) => {
            const row = rows.find(
              (item) => item.flowTitle === title && item.project === project.project,
            )
            if (!row) return '<td class="none">-</td>'
            const counts = SEVERITIES.map(
              (severity) => row.findings.filter((f) => f.severity === severity).length,
            )
            return `<td class="${row.status}"><a href="#${anchor(row)}">${STATUS_TEXT[row.status]}</a><br><small>${counts
              .slice(0, 3)
              .map((count, index) =>
                count ? `<i class="dot ${SEVERITIES[index]}"></i>${count}` : '',
              )
              .join(' ')}</small></td>`
          })
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>`

  // 2. Problems by priority: one entry per rule and spot, with everyone it hits.
  type Group = {
    finding: Finding
    rows: Row[]
    screenshot?: string
    files: { exact: string[]; step: string[] }
    /** Found by a person looking, not by a check (tests/ux/report/manual-findings.json). */
    manual?: { personas: string[]; devices: string; flow: string; foundBy: string }
  }
  const groups = new Map<string, Group>()
  for (const row of rows)
    for (const finding of row.findings) {
      const key = `${finding.rule}|${finding.target ?? finding.detail ?? ''}`
      const group = groups.get(key) ?? {
        finding,
        rows: [],
        screenshot: finding.screenshot,
        files: resolveFiles(root, classMap, finding),
      }
      if (!group.rows.includes(row)) group.rows.push(row)
      group.screenshot ??= finding.screenshot
      groups.set(key, group)
    }
  for (const manual of readManualFindings(root, outputDir))
    groups.set(`manual|${manual.finding.rule}`, { ...manual, rows: [] })
  const personaCount = (group: Group) =>
    group.manual?.personas.length ?? new Set(group.rows.map((r) => r.persona)).size
  const ranked = [...groups.values()].sort(
    (a, b) =>
      SEVERITIES.indexOf(a.finding.severity) - SEVERITIES.indexOf(b.finding.severity) ||
      personaCount(b) - personaCount(a) ||
      b.rows.length - a.rows.length,
  )
  const problemCard = (group: Group) => {
    const { finding } = group
    const who = group.manual
      ? `${group.manual.personas.join(', ')} (${group.manual.devices})`
      : [...new Set(group.rows.map((row) => row.personaName))].join(', ')
    const where =
      group.manual?.flow ?? [...new Set(group.rows.map((row) => row.flowTitle))].join(', ')
    const count = group.manual
      ? `найдено вручную: ${group.manual.foundBy}`
      : `${group.rows.length} раз`
    return `<article class="problem ${finding.severity}">
      ${group.screenshot ? `<a href="${escapeHtml(group.screenshot)}"><img loading="lazy" src="${escapeHtml(group.screenshot)}" alt="Где: ${escapeHtml(finding.title)}"></a>` : '<div class="noshot">без скриншота</div>'}
      <div>
        <h4><span class="sev ${finding.severity}">${SEVERITY_TEXT[finding.severity]}</span> ${escapeHtml(finding.title)}</h4>
        <p>${escapeHtml(finding.detail ?? '')}</p>
        <p class="meta">${finding.wcag ? `WCAG ${escapeHtml(finding.wcag)} · ` : ''}<code>${escapeHtml(finding.rule)}</code> · ${escapeHtml(count)} · ${escapeHtml(who)}</p>
        <p class="meta">Где: ${escapeHtml(where)} → ${escapeHtml(finding.step)}${finding.target ? ` · <code>${escapeHtml(finding.target)}</code>` : ''}</p>
        ${group.files.exact.length ? `<p class="files"><b>Править:</b><br>${fileLinks(root, group.files.exact)}</p>` : ''}
        ${group.files.step.length ? `<p class="files"><b>Шаг затрагивает:</b><br>${fileLinks(root, group.files.step)}</p>` : ''}
      </div>
    </article>`
  }
  const bySeverity = SEVERITIES.map((severity) => {
    const list = ranked.filter((group) => group.finding.severity === severity)
    if (!list.length) return ''
    const body = list.map(problemCard).join('')
    return severity === 'minor'
      ? `<details><summary><h3>${SEVERITY_TEXT[severity]} · ${list.length}</h3></summary>${body}</details>`
      : `<h3 id="sev-${severity}">${SEVERITY_TEXT[severity]} · ${list.length}</h3>${body}`
  }).join('')

  // 3. Each run: metrics, what broke, every step with its eyesight simulations.
  const details = rows
    .slice()
    .sort((a, b) => a.project.localeCompare(b.project) || a.flowTitle.localeCompare(b.flowTitle))
    .map((row) => {
      const { metrics } = row
      const b = metrics.budgets
      return `<details id="${anchor(row)}" class="run"><summary><span class="badge ${row.status}">${STATUS_TEXT[row.status]}</span> ${escapeHtml(row.personaName)} · ${escapeHtml(row.deviceLabel)} - <b>${escapeHtml(row.flowTitle)}</b> <small>${row.findings.length} замечаний</small></summary>
        <p class="metrics">${[
          metric(
            'до интерактивности',
            ms(metrics.interactiveMs),
            b.interactiveMs ? ms(b.interactiveMs) : undefined,
            Boolean(
              b.interactiveMs && metrics.interactiveMs && metrics.interactiveMs > b.interactiveMs,
            ),
          ),
          metric(
            'весь сценарий',
            ms(metrics.flowMs),
            b.flowMs ? ms(b.flowMs) : undefined,
            Boolean(b.flowMs && metrics.flowMs && metrics.flowMs > b.flowMs),
          ),
          metric(
            'действий',
            String(metrics.actions),
            b.actions?.toString(),
            Boolean(b.actions && metrics.actions > b.actions),
          ),
          metric(
            'полей',
            String(metrics.fields),
            b.fields?.toString(),
            Boolean(b.fields !== undefined && metrics.fields > b.fields),
          ),
        ].join(' ')}</p>
        ${row.error ? `<pre class="error">${escapeHtml(row.error)}</pre>` : ''}
        ${
          row.findings.length
            ? `<ul class="list">${row.findings
                .slice()
                .sort((x, y) => SEVERITIES.indexOf(x.severity) - SEVERITIES.indexOf(y.severity))
                .map(
                  (f) =>
                    `<li><span class="sev ${f.severity}">${SEVERITY_TEXT[f.severity]}</span> ${escapeHtml(f.title)} <small>- ${escapeHtml(f.detail ?? '')} (${escapeHtml(f.step)})</small>${f.screenshot ? ` <a href="${escapeHtml(f.screenshot)}">скриншот</a>` : ''}</li>`,
                )
                .join('')}</ul>`
            : ''
        }
        <div class="steps">${row.steps
          .map(
            (step, index) =>
              `<figure><a href="${escapeHtml(step.screenshot)}"><img loading="lazy" src="${escapeHtml(step.screenshot)}" alt="${escapeHtml(step.name)}"></a><figcaption>${index + 1}. ${escapeHtml(step.name)}</figcaption>${step.vision.length ? `<div class="vision">${step.vision.map((shot) => `<a href="${escapeHtml(shot.path)}" title="${escapeHtml(shot.type)}"><img loading="lazy" src="${escapeHtml(shot.path)}" alt="${escapeHtml(shot.type)}"><span>${escapeHtml(shot.type)}</span></a>`).join('')}</div>` : ''}</figure>`,
          )
          .join('')}</div>
      </details>`
    })
    .join('')

  const totals = SEVERITIES.map(
    (severity) => [severity, ranked.filter((g) => g.finding.severity === severity).length] as const,
  )
  const statusCounts = (['pass', 'warn', 'fail', 'broken'] as const).map(
    (status) => [status, rows.filter((r) => r.status === status).length] as const,
  )

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UX-отчёт Awaisa</title>
<style>
:root{--bg:#f5f5f7;--card:#fff;--fg:#1d1d1f;--muted:#6e6e73;--line:rgb(0 0 0/.1);--critical:#b0001a;--serious:#d14900;--moderate:#8a6d00;--minor:#5b5b60;--pass:#1a7f37;--warn:#8a6d00;--fail:#c4001d;--broken:#6b21a8;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#000;--card:#1c1c1e;--fg:#f5f5f7;--muted:#a1a1a6;--line:rgb(255 255 255/.14);--critical:#ff6b7d;--serious:#ff9f5a;--moderate:#e8c547;--minor:#b0b0b5;--pass:#4cd471;--warn:#e8c547;--fail:#ff6b7d;--broken:#c79bff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif}
main{max-width:1280px;margin:0 auto;padding:24px 16px 80px}h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:40px 0 12px}h3{font-size:17px;margin:24px 0 8px}
.lead{color:var(--muted);margin:0 0 20px}.cards{display:flex;flex-wrap:wrap;gap:8px}.card{background:var(--card);border-radius:14px;padding:12px 16px;min-width:120px}.card b{font-size:22px;display:block}
.scroll{overflow-x:auto;background:var(--card);border-radius:16px}table.matrix{border-collapse:collapse;width:100%;font-size:13px}.matrix th,.matrix td{border-bottom:.5px solid var(--line);padding:8px;text-align:left;vertical-align:top}.matrix thead th{position:sticky;top:0;background:var(--card);min-width:110px}.who{font-weight:600}
td.pass a{color:var(--pass)}td.warn a{color:var(--warn)}td.fail a{color:var(--fail)}td.broken a{color:var(--broken)}td a{font-weight:600;text-decoration:none}td.none{color:var(--muted)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:2px}.dot.critical,.sev.critical{background:var(--critical)}.dot.serious,.sev.serious{background:var(--serious)}.dot.moderate,.sev.moderate{background:var(--moderate)}.sev.minor{background:var(--minor)}
.sev{color:#fff;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;white-space:nowrap}
.problem{display:grid;grid-template-columns:minmax(0,320px) 1fr;gap:16px;background:var(--card);border-radius:16px;padding:12px;margin:0 0 10px;border-left:4px solid var(--line)}.problem.critical{border-left-color:var(--critical)}.problem.serious{border-left-color:var(--serious)}.problem.moderate{border-left-color:var(--moderate)}
.problem img{width:100%;border-radius:10px;display:block}.noshot{color:var(--muted);font-size:13px;padding:24px;text-align:center;border:1px dashed var(--line);border-radius:10px}.problem h4{margin:0 0 6px;font-size:15px}.problem p{margin:4px 0}.meta{color:var(--muted);font-size:13px}.files{font-size:13px}.files a{color:inherit}a.vs{text-decoration:none;color:var(--muted)}
code{font-size:12px;background:var(--bg);padding:1px 4px;border-radius:4px;word-break:break-all}
.run{background:var(--card);border-radius:14px;padding:10px 14px;margin:0 0 8px}.run summary{cursor:pointer}.badge{border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;color:#fff}.badge.pass{background:var(--pass)}.badge.warn{background:var(--warn)}.badge.fail{background:var(--fail)}.badge.broken{background:var(--broken)}
.metrics{display:flex;flex-wrap:wrap;gap:12px;font-size:13px}.metric.over b{color:var(--fail)}.error{white-space:pre-wrap;background:var(--bg);padding:8px;border-radius:8px;font-size:12px;overflow:auto}
.list{font-size:13px;padding-left:18px}.steps{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}.steps figure{margin:0;flex:0 0 200px}.steps img{width:200px;border-radius:8px;display:block;border:.5px solid var(--line)}figcaption{font-size:12px;color:var(--muted)}
.vision{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:4px}.vision a{position:relative;display:block}.vision img{width:100%}.vision span{position:absolute;left:2px;bottom:2px;font-size:9px;background:rgb(0 0 0/.6);color:#fff;padding:0 3px;border-radius:3px}
@media (max-width:700px){.problem{grid-template-columns:1fr}}
</style></head><body><main>
<h1>UX-отчёт Awaisa</h1>
<p class="lead">${escapeHtml(new Date(generatedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Bishkek' }))} · ${rows.length} прогонов · ${projects.length} устройств · автоматические проверки, не замена живым сессиям (docs/ux-testing)</p>
<div class="cards">${statusCounts.map(([status, count]) => `<div class="card"><b style="color:var(--${status})">${count}</b>${STATUS_TEXT[status]}</div>`).join('')}${totals
    .slice(0, 3)
    .map(
      ([severity, count]) =>
        `<a class="card" href="#sev-${severity}" style="text-decoration:none;color:inherit"><b style="color:var(--${severity})">${count}</b>${SEVERITY_TEXT[severity]}</a>`,
    )
    .join('')}</div>
<h2>Персона × сценарий</h2><p class="lead">«Не пройден» - сценарий оборвался, «Проблемы» - есть критичные или серьёзные замечания, «Замечания» - только умеренные.</p>
<div class="scroll">${matrix}</div>
<h2>Нарушения по приоритету</h2><p class="lead">Одинаковые замечания собраны вместе; выше те, что задевают больше людей. «Править» - файлы, найденные по CSS-классу элемента; «Шаг затрагивает» - компоненты шага сценария.</p>
${bySeverity || '<p>Замечаний нет.</p>'}
<h2>Все прогоны</h2>${details}
</main></body></html>`
  const path = join(outputDir, 'index.html')
  writeFileSync(path, html)
  return path
}

const isCli = process.argv[1]?.endsWith('build-report.ts')
if (isCli) {
  const outputDir = resolve(
    process.cwd(),
    process.argv.find((arg) => arg.startsWith('--dir='))?.slice(6) ?? '../../reports/ux',
  )
  const path = buildReport(outputDir)
  process.stdout.write(`${path}\n`)
  if (process.argv.includes('--open'))
    void import('node:child_process').then(({ spawn }) => {
      const opener =
        process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
      spawn(opener, [path], {
        detached: true,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      }).unref()
    })
}

export { buildReport }
