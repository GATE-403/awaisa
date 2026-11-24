import { defineConfig } from '@playwright/test'
import { personas, projectGrep, projectName } from './personas'

// Its own API + web pair on their own ports and build folders, so the dev servers and an e2e
// run (3210/4210, .next-e2e, dist-e2e) can go on beside it.
const WEB_PORT = 3310
const API_PORT = 4310
const BASE_URL = process.env.UX_BASE_URL ?? `http://localhost:${WEB_PORT}`
const API_URL = process.env.UX_API_URL ?? `http://localhost:${API_PORT}`

// The e2e helpers we reuse read the API from here.
process.env.E2E_API_URL = API_URL

export default defineConfig({
  testDir: './specs',
  // Test data is named «E2E …», so the e2e teardown removes it too.
  globalTeardown: '../../apps/web/e2e/globalTeardown.ts',
  fullyParallel: true,
  workers: process.env.UX_WORKERS ? Number(process.env.UX_WORKERS) : 2,
  retries: 0,
  // A whole flow may take minutes, so a broken page (a label renamed, the wrong language) once let
  // every flow wait out its timeout: an hour on CI. On CI the run stops after a few failures.
  maxFailures: process.env.CI ? 3 : 0,
  // The pull request's accessibility pass runs every flow in seconds when it is green; the
  // nightly kit has slow phones and zoom, which need longer.
  timeout: process.env.UX_MODE === 'a11y' ? 90_000 : 180_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['./report/ux-reporter.ts', { outputDir: '../../reports/ux' }]],
  outputDir: './test-results',
  use: {
    baseURL: BASE_URL,
    locale: 'en-GB',
    timezoneId: 'Asia/Bishkek',
    trace: 'retain-on-failure',
  },
  // `UX_MODE=a11y` (pnpm test:a11y): one device per persona, accessibility checks only.
  projects: personas.flatMap((persona) =>
    persona.devices
      .filter((device) => process.env.UX_MODE !== 'a11y' || device.a11y)
      .map((device) => ({
        name: projectName(persona, device),
        grep: projectGrep(persona, device),
        use: { ...device.use },
      })),
  ),
  webServer: process.env.UX_BASE_URL
    ? undefined
    : [
        {
          command:
            'rm -rf dist-ux && pnpm exec tsc -p tsconfig.build.json --outDir dist-ux --incremental false && node dist-ux/main.js',
          cwd: '../../apps/api',
          url: `${API_URL}/health`,
          env: {
            API_PORT: String(API_PORT),
            RATE_LIMIT_PER_MINUTE: '10000',
            BOOKING_RATE_LIMIT_PER_MINUTE: '200',
            AUTH_RATE_LIMIT_PER_MINUTE: '1000',
            SMS_DRIVER: 'console',
            // Payments only through the built-in test checkout; never a real acquirer.
            PAYMENT_DRIVER: 'test',
            REDIS_URL: process.env.UX_REDIS_URL ?? 'redis://localhost:6379',
            TZ: 'UTC',
            OTP_TEST_CODE: '111111',
            // Test-only admin number (lib/data.ts UX_ADMIN_PHONE) for flows that set up a deposit.
            ADMIN_PHONES: '+996700000099',
            TELEGRAM_BOT_TOKEN: '',
            TELEGRAM_GATEWAY_TOKEN: '',
          },
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: `pnpm next build && pnpm next start -p ${WEB_PORT}`,
          cwd: '../../apps/web',
          url: BASE_URL,
          env: { API_URL, NEXT_DIST_DIR: '.next-ux', TZ: 'UTC' },
          reuseExistingServer: !process.env.CI,
          timeout: 400_000,
        },
      ],
})
