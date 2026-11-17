import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { buildReport } from './build-report'

// Collects each test's `ux-result` attachment, copies its screenshots next to the report and
// writes `results.json`; `build-report.ts` turns that into `index.html`.

type Options = { outputDir?: string }

type Row = Record<string, unknown> & {
  status: 'pass' | 'warn' | 'fail' | 'broken' | 'skipped'
  error?: string
  durationMs: number
  project: string
  testTitle: string
}

class UxReporter implements Reporter {
  private readonly outputDir: string
  private rows: Row[] = []
  private shotIndex = 0

  constructor(options: Options = {}) {
    this.outputDir = resolve(__dirname, '..', options.outputDir ?? '../../reports/ux')
  }

  private isCleared = false

  // Cleared on the first result, not on begin: `--list` must not wipe the last report.
  private clear() {
    if (this.isCleared) return
    this.isCleared = true
    rmSync(join(this.outputDir, 'shots'), { recursive: true, force: true })
    mkdirSync(join(this.outputDir, 'shots'), { recursive: true })
  }

  private copyShot(path: string | undefined) {
    if (!path || !existsSync(path)) return undefined
    this.clear()
    this.shotIndex += 1
    const name = `${String(this.shotIndex).padStart(4, '0')}-${basename(path)}`
    copyFileSync(path, join(this.outputDir, 'shots', name))
    return `shots/${name}`
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name ?? ''
    const attachment = result.attachments.find((item) => item.name === 'ux-result')
    if (result.status === 'skipped' || !attachment?.body) return
    const data = JSON.parse(attachment.body.toString()) as {
      isCompleted: boolean
      findings: { severity: string; screenshot?: string }[]
      steps: { screenshot: string; vision: { type: string; path: string }[] }[]
    }
    for (const finding of data.findings) finding.screenshot = this.copyShot(finding.screenshot)
    for (const step of data.steps) {
      step.screenshot = this.copyShot(step.screenshot) ?? ''
      for (const shot of step.vision) shot.path = this.copyShot(shot.path) ?? ''
    }
    const blocking = data.findings.some(
      (item) => item.severity === 'critical' || item.severity === 'serious',
    )
    const status: Row['status'] = !data.isCompleted
      ? 'broken'
      : blocking
        ? 'fail'
        : data.findings.some((item) => item.severity === 'moderate')
          ? 'warn'
          : 'pass'
    const error = !data.isCompleted
      ? (result.errors[0]?.message ?? result.error?.message ?? '')
          // biome-ignore lint/suspicious/noControlCharactersInRegex: strips terminal colours
          .replace(/\u001b\[[0-9;]*m/g, '')
          .split('\n')
          .slice(0, 6)
          .join('\n')
      : undefined
    this.rows.push({
      ...data,
      status,
      error,
      durationMs: result.duration,
      project,
      testTitle: test.title,
    })
  }

  onEnd() {
    if (this.rows.length === 0) return
    mkdirSync(this.outputDir, { recursive: true })
    writeFileSync(
      join(this.outputDir, 'results.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), rows: this.rows }, null, 2),
    )
    const html = buildReport(this.outputDir)
    process.stdout.write(`\nUX report: ${html}\n`)
  }

  printsToStdio() {
    return false
  }
}

// biome-ignore lint/style/noDefaultExport: Playwright loads a reporter from its default export
export default UxReporter
