import type { Cookie, Page, TestInfo } from '@playwright/test'

const TEST_CODE = '111111'

const ADMIN_PHONES: Record<string, string> = {
  mobile: '+996700000001',
  desktop: '+996700000002',
}

// A fresh number per test sidesteps the 60-second resend cooldown between tests.
const randomClientPhone = () =>
  `+99677${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`

const adminPhone = (testInfo: TestInfo) => ADMIN_PHONES[testInfo.project.name] ?? '+996700000001'

// The API allows one code per number per minute, so a number signs in once per run and reuses the cookie.
const sessions = new Map<string, Cookie[]>()

const signInViaApi = async (page: Page, phone: string, name = 'E2E Тест') => {
  const cached = sessions.get(phone)
  if (cached) {
    await page.context().addCookies(cached)
    return
  }

  const otp = await page.request.post('/api/auth/otp', { data: { phone } })
  if (!otp.ok()) throw new Error(`OTP failed: ${otp.status()} ${await otp.text()}`)
  const verify = await page.request.post('/api/auth/verify', { data: { phone, code: TEST_CODE } })
  if (!verify.ok()) throw new Error(`Verify failed: ${verify.status()} ${await verify.text()}`)
  await page.request.patch('/api/me', { data: { name } })
  sessions.set(phone, await page.context().cookies())
}

// After a test signs the number out its cookie is dead: the next test signs in afresh.
const forgetSession = (phone: string) => sessions.delete(phone)

const formatPhone = (phone: string) =>
  phone.replace(/^\+996(\d{3})(\d{3})(\d{3})$/, '+996 $1 $2 $3')

export { adminPhone, forgetSession, formatPhone, randomClientPhone, signInViaApi, TEST_CODE }
