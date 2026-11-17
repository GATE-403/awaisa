import { devices } from '@playwright/test'

// One source of truth for who we test for. Every Playwright project is built from this list
// (`playwright.config.ts`), and every spec reads its persona from the project — so a new group
// of people is one more entry here, not a copy of the tests.

type FlowId =
  | 'catalog'
  | 'business'
  | 'booking'
  | 'login'
  | 'profile'
  | 'prepayment'
  | 'waitlist'
  | 'review'
  | 'owner'

type Check =
  /** axe-core, WCAG 2.2 A/AA tags, on every step. */
  | 'axe'
  /** Tap targets: < 24px fails WCAG 2.5.8, < 44px misses the project's own rule (and 2.5.5). */
  | 'targets'
  /** Sideways scroll, clipped text, controls covered by other content, fixed bars eating the screen. */
  | 'layout'
  /** Toasts and hints that vanish on their own, rotating placeholders. */
  | 'timers'
  /** Errors say what is wrong, sit next to their field and are announced. */
  | 'formErrors'
  /** Price, length, address and terms are on screen before personal data is asked for. */
  | 'disclosure'
  /** Steps and fields to reach the goal against the persona's budget. */
  | 'effort'
  /** Time to interactive and time to finish the flow against the persona's budget. */
  | 'performance'

type VisionDeficiency =
  | 'blurredVision'
  | 'reducedContrast'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'

type DeviceProfile = {
  id: string
  label: string
  use: (typeof devices)[string]
  /** Browser zoom: the layout gets viewport / zoom CSS pixels, like Ctrl + in Chrome. */
  zoom?: number
  /** System «large text» (Android font scale, WebView textZoom): every `--text-*` token × this. */
  textScale?: number
  /** Screenshot every step through each simulated eyesight (CDP setEmulatedVisionDeficiency). */
  vision?: VisionDeficiency[]
  /** Lighthouse «Slow 4G»: 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up, CPU 4× slower. */
  network?: 'slow4g'
  /** Also run the keyboard-only specs on this device. */
  keyboard?: boolean
  /** Also run the page-wide checks (browser font size setting) on this device. */
  general?: boolean
  /** One of the few devices `pnpm test:a11y` runs on (one per persona). */
  a11y?: boolean
}

type Budgets = {
  /** Cold load of the flow's first page to interactive, ms (measured only with `performance`). */
  interactiveMs: number
  /** From the first page to the goal, without our own checks' time, ms. */
  flowMs: Partial<Record<FlowId, number>>
  /** Taps/keys and filled fields to reach the goal. */
  actions: Partial<Record<FlowId, number>>
  fields: Partial<Record<FlowId, number>>
}

type Persona = {
  id: string
  name: string
  age: number
  group: 'senior' | 'middle' | 'young' | 'owner'
  /** One line for the report. */
  summary: string
  devices: DeviceProfile[]
  flows: FlowId[]
  checks: Check[]
  budgets: Budgets
}

// iPhones run in Chromium with their screen, pixel ratio, touch and user agent: the eyesight and
// network emulation are Chrome DevTools features, and CI only caches Chromium.
const chromium = (device: (typeof devices)[string]) => ({
  ...device,
  defaultBrowserType: 'chromium' as const,
})

const ALL_VISION: VisionDeficiency[] = [
  'blurredVision',
  'reducedContrast',
  'protanopia',
  'deuteranopia',
  'tritanopia',
]

const LAPTOP_1366 = { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } }

const DEFAULT_ACTIONS: Partial<Record<FlowId, number>> = {
  catalog: 4,
  business: 3,
  booking: 7,
  login: 5,
  profile: 8,
  // Time, name, phone, «Записаться», «Оплатить».
  prepayment: 5,
  waitlist: 6,
  review: 4,
  owner: 12,
}

const DEFAULT_FIELDS: Partial<Record<FlowId, number>> = {
  catalog: 1,
  booking: 2,
  login: 3,
  waitlist: 2,
  review: 1,
  owner: 4,
}

const personas: Persona[] = [
  {
    id: 'senior',
    name: 'Галина Петровна',
    age: 68,
    group: 'senior',
    summary:
      'Пенсионерка, очки для чтения и начальная катаракта; «крупный шрифт» на телефоне, на ноутбуке увеличивает страницу.',
    devices: [
      {
        id: 'phone-large-text',
        label: 'Android, крупный шрифт 150%',
        use: chromium(devices['Pixel 7']),
        textScale: 1.5,
      },
      {
        id: 'laptop-zoom-200',
        label: 'Ноутбук 1366×768, масштаб 200%',
        use: {
          ...devices['Desktop Chrome'],
          viewport: { width: 683, height: 384 },
          deviceScaleFactor: 2,
        },
        zoom: 2,
        keyboard: true,
        a11y: true,
      },
      {
        id: 'laptop-vision',
        label: 'Ноутбук 1366×768, симуляция зрения',
        use: LAPTOP_1366,
        vision: ALL_VISION,
      },
    ],
    flows: ['catalog', 'business', 'booking', 'login', 'review', 'profile'],
    checks: ['axe', 'targets', 'layout', 'timers', 'formErrors', 'effort'],
    budgets: {
      interactiveMs: 6000,
      flowMs: {},
      actions: DEFAULT_ACTIONS,
      fields: DEFAULT_FIELDS,
    },
  },
  {
    id: 'middle',
    name: 'Сергей',
    age: 46,
    group: 'middle',
    summary:
      'Инженер, записывается с рабочего ноутбука или планшета; сравнивает цены и хочет знать условия до того, как оставит телефон.',
    devices: [
      {
        id: 'laptop-1366',
        label: 'Ноутбук 1366×768',
        use: LAPTOP_1366,
        keyboard: true,
        general: true,
        a11y: true,
      },
      {
        id: 'desktop-1920',
        label: 'Монитор 1920×1080',
        use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
      },
      { id: 'tablet', label: 'iPad (7 пок.)', use: chromium(devices['iPad (gen 7)']) },
    ],
    flows: ['catalog', 'business', 'booking', 'prepayment', 'profile'],
    checks: ['axe', 'targets', 'layout', 'timers', 'formErrors', 'disclosure', 'effort'],
    budgets: {
      interactiveMs: 4000,
      flowMs: {},
      actions: DEFAULT_ACTIONS,
      fields: DEFAULT_FIELDS,
    },
  },
  {
    id: 'young',
    name: 'Айпери',
    age: 21,
    group: 'young',
    summary:
      'Студентка, только телефон и мобильный интернет, одной рукой на ходу; бросает, если грузится дольше пары секунд.',
    devices: [
      {
        id: 'iphone-se',
        label: 'iPhone SE (375×667)',
        use: chromium(devices['iPhone SE']),
        a11y: true,
      },
      { id: 'iphone-14', label: 'iPhone 14', use: chromium(devices['iPhone 14']) },
      {
        id: 'pixel-7-slow-4g',
        label: 'Pixel 7, Slow 4G, CPU ×4',
        use: chromium(devices['Pixel 7']),
        network: 'slow4g',
      },
    ],
    flows: ['catalog', 'booking', 'login', 'waitlist', 'profile'],
    checks: ['axe', 'targets', 'layout', 'timers', 'formErrors', 'effort', 'performance'],
    budgets: {
      // Slow 4G + 4× CPU: Lighthouse calls ≤ 3.8 s «good» TTI on its mobile profile.
      interactiveMs: 5000,
      flowMs: {
        catalog: 15_000,
        booking: 45_000,
        login: 25_000,
        waitlist: 40_000,
        profile: 40_000,
      },
      actions: { ...DEFAULT_ACTIONS, booking: 6 },
      fields: DEFAULT_FIELDS,
    },
  },
  {
    id: 'owner',
    name: 'Нурлан',
    age: 39,
    group: 'owner',
    summary:
      'Владелец барбершопа на два кресла; заводит страницу вечером с телефона, расписание смотрит с ноутбука на ресепшене.',
    devices: [
      { id: 'laptop-1366', label: 'Ноутбук 1366×768', use: LAPTOP_1366 },
      { id: 'phone', label: 'Pixel 7', use: chromium(devices['Pixel 7']), a11y: true },
    ],
    flows: ['owner'],
    checks: ['axe', 'targets', 'layout', 'timers', 'formErrors', 'effort'],
    budgets: {
      interactiveMs: 5000,
      flowMs: {},
      actions: DEFAULT_ACTIONS,
      fields: DEFAULT_FIELDS,
    },
  },
]

const projectName = (persona: Persona, device: DeviceProfile) => `${persona.id}·${device.id}`

// Which tests a project runs: its persona's flows, plus keyboard/page-wide specs on chosen devices.
const projectGrep = (persona: Persona, device: DeviceProfile) =>
  new RegExp(
    [`@${persona.id}\\b`, device.keyboard && '@keyboard\\b', device.general && '@general\\b']
      .filter(Boolean)
      .join('|'),
  )

const findProfile = (project: string) => {
  for (const persona of personas)
    for (const device of persona.devices)
      if (projectName(persona, device) === project) return { persona, device }
  throw new Error(`No persona for project ${project}`)
}

export type { Budgets, Check, DeviceProfile, FlowId, Persona, VisionDeficiency }
export { findProfile, personas, projectGrep, projectName }
