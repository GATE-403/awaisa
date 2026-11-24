import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { CDPSession, Locator, Page, TestInfo } from '@playwright/test'
import type { Check, DeviceProfile, FlowId, Persona } from '../personas'
import { uxInitScript } from './initScript'
import {
  checkFieldError,
  checkLayout,
  checkTargets,
  collectTimers,
  type Described,
  type TimerResult,
  visibleText,
} from './pageChecks'

type Severity = 'critical' | 'serious' | 'moderate' | 'minor'

type Finding = {
  severity: Severity
  /** Stable id: an axe rule or one of ours («ux-…»). */
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

type StepRecord = {
  name: string
  url: string
  screenshot: string
  vision: { type: string; path: string }[]
}

type UxResult = {
  persona: string
  personaName: string
  device: string
  deviceLabel: string
  flow: string
  flowTitle: string
  isCompleted: boolean
  findings: Finding[]
  steps: StepRecord[]
  metrics: {
    interactiveMs?: number
    flowMs?: number
    actions: number
    fields: number
    budgets: { interactiveMs?: number; flowMs?: number; actions?: number; fields?: number }
  }
}

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const MAX_SHOTS = 24
const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}

// System «large text» scales the type tokens only: read them from the built tokens.css.
const scaledTextVars = (scale: number) => {
  const css = readFileSync(join(__dirname, '../../../packages/tokens/dist/tokens.css'), 'utf8')
  const vars: Record<string, string> = {}
  for (const [, name, value, unit] of css.matchAll(/(--text-[\w-]+):\s*([\d.]+)(px|rem)/g))
    vars[name] = `${Math.round(Number(value) * scale * 1000) / 1000}${unit}`
  return vars
}

const PERSONAL = /^(Имя|Телефон|Номер телефона|Ваше имя|Код подтверждения)/

class UxContext {
  readonly page: Page
  readonly persona: Persona
  readonly device: DeviceProfile
  readonly testInfo: TestInfo
  readonly checks: Set<Check>
  flow: { id: FlowId | 'general' | 'keyboard'; title: string } = { id: 'general', title: '' }
  isCompleted = false

  private findings: Finding[] = []
  private keys = new Set<string>()
  private steps: StepRecord[] = []
  private shots = 0
  private startedAt = 0
  private checksMs = 0
  private actions = 0
  private fields = new Set<string>()
  private interactiveMs: number | undefined
  private seenText = ''
  private isDisclosureChecked = false
  private toasts = new Map<string, TimerResult['toasts'][number]>()
  private churn = new Map<string, TimerResult['churn'][number]>()
  private currentStep = 'Начало'
  private currentFiles: string[] = []
  private cdp: CDPSession | null = null

  constructor(page: Page, persona: Persona, device: DeviceProfile, testInfo: TestInfo) {
    this.page = page
    this.persona = persona
    this.device = device
    this.testInfo = testInfo
    const only = process.env.UX_CHECKS?.split(',').filter(Boolean) as Check[] | undefined
    this.checks = new Set(
      only?.length ? persona.checks.filter((c) => only.includes(c)) : persona.checks,
    )
  }

  get isMobile() {
    return Boolean(this.device.use.isMobile)
  }

  async setup() {
    const textVars = this.device.textScale ? scaledTextVars(this.device.textScale) : {}
    await this.page.addInitScript(uxInitScript, { textVars })
    if (this.device.network === 'slow4g' || this.device.vision) {
      this.cdp = await this.page.context().newCDPSession(this.page)
    }
    if (this.cdp && this.device.network === 'slow4g') {
      await this.cdp.send('Network.enable')
      await this.cdp.send('Network.emulateNetworkConditions', SLOW_4G)
      await this.cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    }
  }

  begin(id: FlowId | 'general' | 'keyboard', title: string) {
    this.flow = { id, title }
  }

  /** Our own checks' time is not the person's time. */
  private async paused<T>(run: () => Promise<T>) {
    const started = Date.now()
    try {
      return await run()
    } finally {
      this.checksMs += Date.now() - started
    }
  }

  async goto(path: string) {
    if (this.startedAt) await this.paused(() => this.collectTimers())
    const isFirst = !this.startedAt
    if (isFirst) this.startedAt = Date.now()
    await this.page.goto(path, { waitUntil: 'domcontentloaded' })
    if (isFirst && this.checks.has('performance')) {
      this.interactiveMs = await this.measureInteractive()
    }
  }

  // Lighthouse-style TTI: after first paint, the end of the last long task before a 2 s quiet window.
  private async measureInteractive() {
    const deadline = Date.now() + 30_000
    let result = 0
    while (Date.now() < deadline) {
      const timing = await this.page.evaluate(() => {
        const store = (window as unknown as { __ux?: { fcp: number; lastLongTaskEnd: number } })
          .__ux
        const nav = performance.getEntriesByType('navigation')[0] as
          | PerformanceNavigationTiming
          | undefined
        return {
          now: performance.now(),
          fcp: store?.fcp ?? 0,
          lastLongTaskEnd: store?.lastLongTaskEnd ?? 0,
          dcl: nav?.domContentLoadedEventEnd ?? 0,
        }
      })
      if (timing.fcp && timing.now - Math.max(timing.lastLongTaskEnd, timing.fcp) >= 2000) {
        result = Math.round(Math.max(timing.fcp, timing.lastLongTaskEnd, timing.dcl))
        break
      }
      await this.page.waitForTimeout(250)
    }
    // The quiet window is part of the definition, not of the person's flow.
    this.checksMs += 2000
    return result || undefined
  }

  // ---- Actions a person takes (counted for the effort budget) ----

  async tap(locator: Locator) {
    this.actions += 1
    await locator.click()
  }

  async check(locator: Locator) {
    this.actions += 1
    await locator.check({ force: true })
  }

  async press(key: string) {
    this.actions += 1
    await this.page.keyboard.press(key)
  }

  async fill(locator: Locator, value: string) {
    const label =
      (await locator.getAttribute('aria-label')) ??
      (await locator.evaluate((element) => window.__uxName?.(element) ?? '').catch(() => ''))
    if (PERSONAL.test(label) && !this.isDisclosureChecked) await this.checkDisclosure(label)
    this.actions += 1
    this.fields.add(label || String(this.fields.size))
    await locator.fill(value)
  }

  /** Steps a person does not count as «work» (a correction after an error, a dismissed hint). */
  async uncounted(run: () => Promise<void>) {
    const actions = this.actions
    await run()
    this.actions = actions
  }

  countAction(times = 1) {
    this.actions += times
  }

  // ---- Checks ----

  /** A screen worth looking at: every check the persona asks for runs here. */
  async step(name: string, files: string[] = []) {
    this.currentStep = name
    this.currentFiles = files
    await this.paused(async () => {
      await this.page.waitForLoadState('domcontentloaded')
      // Let sheets and transitions settle so we judge what a person sees.
      await this.page.waitForTimeout(this.device.network ? 600 : 350)
      // Finite animations (fades, slides) end first: a row caught mid-fade read as 1.3:1.
      await this.page
        .evaluate(() =>
          Promise.race([
            Promise.all(
              document
                .getAnimations()
                .filter(
                  (animation) =>
                    animation.playState === 'running' &&
                    Number.isFinite(animation.effect?.getComputedTiming().endTime ?? Infinity),
                )
                .map((animation) => animation.finished.catch(() => undefined)),
            ),
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]),
        )
        .catch(() => undefined)
      const index = this.steps.length + 1
      const screenshot = await this.saveShot(`step-${index}`)
      const record: StepRecord = { name, url: this.page.url(), screenshot, vision: [] }
      this.steps.push(record)
      this.seenText += ` ${await visibleText(this.page)}`

      if (this.checks.has('axe')) await this.runAxe()
      if (this.checks.has('targets')) await this.runTargets()
      if (this.checks.has('layout')) await this.runLayout()
      if (this.checks.has('timers')) await this.collectTimers()
      if (this.device.vision && this.cdp) {
        for (const type of this.device.vision) {
          await this.cdp.send('Emulation.setEmulatedVisionDeficiency', { type })
          record.vision.push({ type, path: await this.saveShot(`step-${index}-${type}`) })
        }
        await this.cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' })
      }
    })
  }

  private async runAxe() {
    // A fade-in caught halfway reads as a contrast failure (the header's rotating search hint
    // starts at opacity 0): play short animations to their end first. Endless ones stay.
    await this.page
      .evaluate(() => {
        for (const animation of document.getAnimations()) {
          if (animation.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY) {
            animation.finish()
          }
        }
      })
      .catch(() => undefined)
    const results = await new AxeBuilder({ page: this.page })
      .withTags(WCAG_TAGS)
      .exclude('.leaflet-container')
      .analyze()
      .catch(() => null)
    if (!results) return
    for (const violation of results.violations) {
      const wcag = violation.tags
        .filter((tag) => /^wcag\d{3,4}$/.test(tag))
        .map((tag) => tag.replace(/^wcag(\d)(\d)(\d+)$/, '$1.$2.$3'))
        .join(', ')
      for (const node of violation.nodes.slice(0, 3)) {
        const selector = node.target.map(String).at(-1) ?? ''
        const described = await this.describeSelector(selector)
        // «Partially obscured» depends on where the page was scrolled when axe looked (a sticky
        // bar over the top of a short screen); real overlaps are our own ux-control-covered.
        const isScrollCover =
          violation.id === 'target-size' && /obscured/i.test(node.failureSummary ?? '')
        await this.add({
          severity: isScrollCover
            ? 'moderate'
            : ((violation.impact as Severity | null) ?? 'moderate'),
          rule: violation.id,
          title: violation.help,
          detail: `${described?.name ? `«${described.name}»: ` : ''}${node.failureSummary?.split('\n').slice(1, 3).join(' ').trim() ?? ''}`,
          wcag,
          // The stable path, not axe's selector: it changes once we tag the element.
          target: described?.selector ?? selector,
          name: described?.name,
          classes: described?.classes ?? [],
          shoot: described ? `[data-ux-id="${described.id}"]` : selector,
        })
      }
    }
  }

  private async runTargets() {
    const targets = await checkTargets(this.page).catch(() => [])
    for (const target of targets) {
      if (target.isInline) continue
      const isFail = (target.width < 23.5 || target.height < 23.5) && !target.hasSpacing
      await this.add({
        severity: isFail ? 'serious' : 'moderate',
        rule: isFail ? 'ux-target-size-24' : 'ux-target-size-44',
        title: isFail
          ? 'Цель меньше 24×24: в неё трудно попасть (WCAG 2.5.8)'
          : 'Цель меньше 44×44 - правило проекта и Apple HIG',
        detail: `«${target.name || target.selector}» ${Math.round(target.width)}×${Math.round(target.height)}`,
        wcag: isFail ? '2.5.8' : '2.5.5',
        target: target.selector,
        name: target.name,
        classes: target.classes,
        shoot: `[data-ux-id="${target.id}"]`,
      })
    }
  }

  private async runLayout() {
    const layout = await checkLayout(this.page).catch(() => null)
    if (!layout) return
    const context = this.device.zoom
      ? ` при масштабе ${this.device.zoom * 100}%`
      : this.device.textScale
        ? ` при крупном шрифте ${this.device.textScale * 100}%`
        : ''
    if (layout.overflowX > 1) {
      const culprit = layout.wideElements[0]
      await this.add({
        severity: 'serious',
        rule: 'ux-horizontal-scroll',
        title: `Страница прокручивается вбок${context}`,
        detail: `Лишние ${layout.overflowX}px${culprit ? `, шире экрана: ${culprit.selector}` : ''}`,
        wcag: '1.4.10',
        target: culprit?.selector,
        classes: culprit?.classes ?? [],
        shoot: culprit ? `[data-ux-id="${culprit.id}"]` : undefined,
      })
    }
    for (const item of layout.clipped) {
      const isQuiet = item.isEllipsis || item.isClamp
      await this.add({
        severity: isQuiet ? 'moderate' : 'serious',
        rule: isQuiet ? 'ux-text-truncated' : 'ux-text-clipped',
        title: isQuiet ? `Текст сокращён многоточием${context}` : `Текст обрезан рамкой${context}`,
        detail: `«${item.name.slice(0, 60)}» (${item.axis === 'x' ? 'по ширине' : 'по высоте'})`,
        wcag: isQuiet ? undefined : '1.4.4',
        target: item.selector,
        name: item.name,
        classes: item.classes,
        shoot: `[data-ux-id="${item.id}"]`,
      })
    }
    for (const item of layout.covered) {
      await this.add({
        severity: 'serious',
        rule: 'ux-control-covered',
        title: `Кнопку или ссылку перекрывает другой элемент${context}`,
        detail: `«${item.name || item.selector}» под ${item.by.selector}`,
        wcag: '1.4.10',
        target: item.selector,
        name: item.name,
        classes: item.classes,
        shoot: `[data-ux-id="${item.id}"]`,
      })
    }
    for (const row of layout.wobblyRows)
      await this.add({
        severity: 'moderate',
        rule: 'ux-row-wobble',
        title: `Лента прокручивается и вбок, и вверх-вниз${context}`,
        detail: `${row.selector}: лишние ${row.extra}px по вертикали - лента «ёрзает» под пальцем`,
        target: row.selector,
        classes: row.classes,
        shoot: `[data-ux-id="${row.id}"]`,
      })
    if (layout.fixedShare > 0.34) {
      const share = Math.round(layout.fixedShare * 100)
      await this.add({
        severity: layout.fixedShare > 0.5 ? 'serious' : 'moderate',
        rule: 'ux-fixed-chrome',
        title: `Закреплённые панели занимают ${share}% экрана${context}`,
        detail: layout.fixedParts.map((part) => part.selector).join('; '),
        wcag: '1.4.10',
        target: layout.fixedParts[0]?.selector,
        classes: layout.fixedParts.flatMap((part) => part.classes).slice(0, 8),
        shoot: layout.fixedParts[0] ? `[data-ux-id="${layout.fixedParts[0].id}"]` : undefined,
        dedupeBy: 'ux-fixed-chrome',
      })
    }
  }

  private async collectTimers() {
    const timers = await collectTimers(this.page)
    for (const toast of timers.toasts) this.toasts.set(toast.text, toast)
    for (const item of timers.churn) this.churn.set(item.selector, item)
  }

  /** Errors: what is wrong, next to the field, announced. */
  async expectFieldError(field: Locator, pattern?: RegExp) {
    if (!this.checks.has('formErrors')) return
    await this.paused(async () => {
      await this.page.waitForTimeout(300)
      const handle = await field.elementHandle({ timeout: 5000 }).catch(() => null)
      if (!handle) return
      const selector = await handle.evaluate((element) => {
        const id = window.__uxDescribe(element).id
        return `[data-ux-id="${id}"]`
      })
      const result = await checkFieldError(this.page, selector, pattern?.source ?? null)
      const fieldName = result.field?.name ?? selector
      const base = {
        target: result.field?.selector,
        name: fieldName,
        classes: result.field?.classes ?? [],
        shoot: selector,
      }
      if (!result.message) {
        await this.add({
          ...base,
          severity: 'serious',
          rule: 'ux-error-missing',
          title: 'После ошибки не видно, что не так',
          detail: `Поле «${fieldName}»: рядом нет текста ошибки${pattern ? ` (${pattern.source})` : ''}`,
          wcag: '3.3.1',
        })
        return
      }
      const viewport = this.page.viewportSize()
      const limit = viewport && viewport.width < 768 ? 48 : 64
      if (result.message.gap > limit)
        await this.add({
          ...base,
          severity: 'serious',
          rule: 'ux-error-far',
          title: 'Текст ошибки далеко от поля',
          detail: `«${result.message.text}» в ${result.message.gap}px от поля «${fieldName}»`,
          wcag: '3.3.1',
          shoot: `[data-ux-id="${result.message.id}"]`,
        })
      if (!result.isInvalid)
        await this.add({
          ...base,
          severity: 'moderate',
          rule: 'ux-error-not-invalid',
          title: 'Поле с ошибкой не помечено aria-invalid',
          detail: `Поле «${fieldName}»: экранный диктор не скажет, что оно с ошибкой`,
          wcag: '3.3.1, 4.1.2',
        })
      if (!result.message.isAnnounced)
        await this.add({
          ...base,
          severity: 'moderate',
          rule: 'ux-error-not-announced',
          title: 'Ошибку не объявляют и она не связана с полем',
          detail: `«${result.message.text}»: нет role="alert"/aria-live и aria-describedby`,
          wcag: '4.1.3',
        })
    })
  }

  // Before the first personal field: has the person been able to read what it costs, how long,
  // where and on what terms?
  private async checkDisclosure(field: string) {
    this.isDisclosureChecked = true
    if (!this.checks.has('disclosure')) return
    await this.paused(async () => {
      const text = `${this.seenText} ${await visibleText(this.page)}`
      const facts: [string, RegExp][] = [
        ['цена', /\d[\d\s  ]*\s?сом/],
        ['длительность', /\d+\s?(мин|ч\b|час)/],
        ['адрес', /(ул\.|улица|просп|пр\.|мкр|бульв|пер\.)/i],
        ['условия оплаты и отмены', /(оплат|отмен|перенести|предоплат)/i],
      ]
      const missing = facts.filter(([, regex]) => !regex.test(text)).map(([name]) => name)
      if (missing.length)
        await this.add({
          severity: 'serious',
          rule: 'ux-disclosure',
          title: 'Личные данные просят раньше, чем показали условия',
          detail: `Перед полем «${field}» не было видно: ${missing.join(', ')}`,
          classes: [],
        })
    })
  }

  finding(
    input: Omit<Finding, 'step' | 'url' | 'files' | 'classes'> & {
      classes?: string[]
      shoot?: string
    },
  ) {
    return this.paused(() => this.add({ ...input, classes: input.classes ?? [] }))
  }

  private async add(
    input: Omit<Finding, 'step' | 'url' | 'files'> & { shoot?: string; dedupeBy?: string },
  ) {
    const key = input.dedupeBy ?? `${input.rule}|${input.target ?? input.detail ?? ''}`
    if (this.keys.has(key)) return
    this.keys.add(key)
    let screenshot: string | undefined
    if (input.shoot && this.shots < MAX_SHOTS) screenshot = await this.shootTarget(input.shoot)
    const { shoot: _shoot, dedupeBy: _dedupe, ...finding } = input
    this.findings.push({
      ...finding,
      step: this.currentStep,
      url: this.page.url(),
      files: this.currentFiles,
      screenshot,
    })
  }

  private async describeSelector(selector: string) {
    if (!selector) return null
    return this.page
      .evaluate((value) => {
        const element = document.querySelector(value)
        return element ? window.__uxDescribe(element) : null
      }, selector)
      .catch(() => null) as Promise<Described | null>
  }

  // The problem spot, outlined in red, in a screenshot of the screen around it.
  private async shootTarget(selector: string) {
    this.shots += 1
    const isMarked = await this.page
      .evaluate((value) => {
        const element = document.querySelector(value)
        if (!element) return false
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        const rect = element.getBoundingClientRect()
        const mark = document.createElement('div')
        mark.id = 'ux-mark'
        Object.assign(mark.style, {
          position: 'fixed',
          left: `${rect.left - 4}px`,
          top: `${rect.top - 4}px`,
          width: `${rect.width + 8}px`,
          height: `${rect.height + 8}px`,
          outline: '3px solid #ff1f4b',
          borderRadius: '6px',
          boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.18)',
          zIndex: '2147483647',
          pointerEvents: 'none',
        })
        document.body.append(mark)
        return true
      }, selector)
      .catch(() => false)
    if (!isMarked) return undefined
    const path = await this.saveShot(`problem-${this.shots}`)
    await this.page.evaluate(() => document.getElementById('ux-mark')?.remove()).catch(() => {})
    return path
  }

  private async saveShot(name: string) {
    const path = this.testInfo.outputPath(`${name}.jpg`)
    await this.page
      .screenshot({ path, type: 'jpeg', quality: 70, animations: 'disabled', timeout: 15_000 })
      .catch(() => {})
    return path
  }

  // ---- The end of a flow ----

  complete() {
    this.isCompleted = true
  }

  /** Problems that should stop a release: critical and serious. */
  blocking() {
    return this.findings
      .filter((finding) => finding.severity === 'critical' || finding.severity === 'serious')
      .map(
        (finding) =>
          `${finding.severity}: ${finding.title} - ${finding.detail ?? finding.target ?? ''}`,
      )
  }

  async finish() {
    if (this.checks.has('timers')) {
      await this.collectTimers().catch(() => {})
      this.reportTimers()
    }
    const budgets = this.persona.budgets
    const flowId = this.flow.id as FlowId
    const flowMs = this.startedAt ? Date.now() - this.startedAt - this.checksMs : undefined
    if (this.isCompleted && this.checks.has('effort')) {
      const actionBudget = budgets.actions[flowId]
      if (actionBudget && this.actions > actionBudget)
        this.findings.push(
          this.plain(
            'moderate',
            'ux-effort-actions',
            'Слишком много действий до цели',
            `${this.actions} нажатий и вводов при бюджете ${actionBudget}`,
          ),
        )
      const fieldBudget = budgets.fields[flowId]
      if (fieldBudget !== undefined && this.fields.size > fieldBudget)
        this.findings.push(
          this.plain(
            'moderate',
            'ux-effort-fields',
            'Слишком много полей',
            `${this.fields.size} полей при бюджете ${fieldBudget}: ${[...this.fields].join(', ')}`,
          ),
        )
    }
    if (this.isCompleted && this.checks.has('performance')) {
      if (this.interactiveMs && this.interactiveMs > budgets.interactiveMs)
        this.findings.push(
          this.plain(
            'serious',
            'ux-slow-interactive',
            'Долго до первого нажатия',
            `Интерактивна через ${(this.interactiveMs / 1000).toFixed(1)} с при бюджете ${budgets.interactiveMs / 1000} с (${this.device.label})`,
          ),
        )
      const flowBudget = budgets.flowMs[flowId]
      if (flowMs && flowBudget && flowMs > flowBudget)
        this.findings.push(
          this.plain(
            'serious',
            'ux-slow-flow',
            'Сценарий занимает слишком долго',
            `${(flowMs / 1000).toFixed(1)} с при бюджете ${flowBudget / 1000} с (${this.device.label})`,
          ),
        )
    }

    const result: UxResult = {
      persona: this.persona.id,
      personaName: `${this.persona.name}, ${this.persona.age}`,
      device: this.device.id,
      deviceLabel: this.device.label,
      flow: this.flow.id,
      flowTitle: this.flow.title,
      isCompleted: this.isCompleted,
      findings: this.findings,
      steps: this.steps,
      metrics: {
        interactiveMs: this.interactiveMs,
        flowMs: this.isCompleted ? flowMs : undefined,
        actions: this.actions,
        fields: this.fields.size,
        budgets: {
          interactiveMs: this.checks.has('performance') ? budgets.interactiveMs : undefined,
          flowMs: this.checks.has('performance') ? budgets.flowMs[flowId] : undefined,
          actions: budgets.actions[flowId],
          fields: budgets.fields[flowId],
        },
      },
    }
    await this.testInfo.attach('ux-result', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    })
    await this.cdp?.detach().catch(() => {})
  }

  private reportTimers() {
    const senior = this.persona.group === 'senior'
    for (const toast of this.toasts.values()) {
      if (!toast.leftOnItsOwn || toast.lifetimeMs === null || toast.lifetimeMs >= 20_000) continue
      const seconds = (toast.lifetimeMs / 1000).toFixed(1)
      this.findings.push({
        ...this.plain(
          toast.hasAction ? 'serious' : senior ? 'moderate' : 'minor',
          toast.hasAction ? 'ux-timed-action' : 'ux-timed-message',
          toast.hasAction
            ? 'Сообщение с действием исчезает само'
            : 'Сообщение исчезает раньше, чем его успеют прочитать',
          `«${toast.text}» - ${seconds} с${toast.hasAction ? ': кнопку можно не успеть нажать' : ''}`,
        ),
        wcag: '2.2.1',
        files: ['packages/ui/src/components/Toast/Toast.tsx'],
        classes: [],
      })
    }
    for (const item of this.churn.values())
      this.findings.push({
        ...this.plain(
          senior ? 'moderate' : 'minor',
          'ux-auto-changing',
          'Текст меняется сам, без действий человека',
          `«${item.text}» сменился ${item.count} раз`,
        ),
        wcag: '2.2.2',
        target: item.selector,
        classes: item.classes,
      })
  }

  private plain(severity: Severity, rule: string, title: string, detail: string): Finding {
    return {
      severity,
      rule,
      title,
      detail,
      step: 'Весь сценарий',
      url: this.page.url(),
      classes: [],
      files: [],
    }
  }
}

export type { Finding, Severity, StepRecord, UxResult }
export { UxContext }
