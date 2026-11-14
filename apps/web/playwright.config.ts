import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = 3210
const API_PORT = 4210
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}`

process.env.E2E_API_URL = API_URL

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/globalTeardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: BASE_URL,
    locale: 'ru-RU',
    timezoneId: 'Asia/Bishkek',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // A dedicated API + web pair on their own ports: the dev servers stay untouched and the
  // per-IP rate limits are raised, because every test request comes from localhost.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          // Built into dist-e2e: `nest build` empties dist/, which a running `pnpm dev` serves from.
          // Not incremental: its .tsbuildinfo outlives dist-e2e and would make tsc skip the emit.
          command:
            'rm -rf dist-e2e && pnpm exec tsc -p tsconfig.build.json --outDir dist-e2e --incremental false && node dist-e2e/main.js',
          cwd: '../api',
          url: `${API_URL}/health`,
          env: {
            API_PORT: String(API_PORT),
            RATE_LIMIT_PER_MINUTE: '10000',
            BOOKING_RATE_LIMIT_PER_MINUTE: '100',
            AUTH_RATE_LIMIT_PER_MINUTE: '1000',
            SMS_DRIVER: 'console',
            // The cache under test is the real one: Redis when it runs (pnpm db:up), else memory.
            REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6379',
            // Servers run on UTC like CI and production; the browser is in Bishkek (timezoneId).
            TZ: 'UTC',
            OTP_TEST_CODE: '111111',
            ADMIN_PHONES: '+996700000001,+996700000002',
            // The owners' bot without a token: messages are logged, the webhook is driven by tests.
            TELEGRAM_BOT_USERNAME: 'awaisa_e2e_bot',
            TELEGRAM_WEBHOOK_SECRET: 'e2e-webhook-secret',
            TELEGRAM_BOT_TOKEN: '',
          },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `pnpm next build && pnpm next start -p ${WEB_PORT}`,
          url: BASE_URL,
          env: { API_URL, NEXT_DIST_DIR: '.next-e2e', TZ: 'UTC' },
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      ],
})
