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
          command: 'pnpm build && pnpm start',
          cwd: '../api',
          url: `${API_URL}/health`,
          env: {
            API_PORT: String(API_PORT),
            RATE_LIMIT_PER_MINUTE: '10000',
            BOOKING_RATE_LIMIT_PER_MINUTE: '100',
            AUTH_RATE_LIMIT_PER_MINUTE: '1000',
            SMS_DRIVER: 'console',
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
          env: { API_URL },
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      ],
})
