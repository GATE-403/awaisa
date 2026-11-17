import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'

// The admins' funnels page: one flow at a time, cut by kind of device, with signals and devices.
test.describe('Insights', () => {
  test('a platform admin reads a flow for one kind of device; others get «not found»', async ({
    page,
  }, testInfo) => {
    // A login on a huge-text phone, so the cut has something to show.
    const session = `e2e-${Math.random().toString(36).slice(2, 12)}`
    const sent = await page.request.post('/api/telemetry/events', {
      data: {
        session,
        device: {
          type: 'phone',
          os: 'ios',
          app: 'web',
          textScale: 'huge',
          net: 'fast',
          lang: 'ru',
          reducedMotion: false,
          contrastMore: false,
          dark: false,
        },
        events: [
          { step: 'login_open' },
          { step: 'otp_sent', meta: { channel: 'sms' } },
          { step: 'form_error', meta: { field: 'phone' } },
        ],
      },
    })
    expect(sent.status()).toBe(202)

    // The page streams (PPR): the refusal is the «not found» page, not a status code.
    await signInViaApi(page, randomClientPhone())
    await page.goto('/insights')
    await expect(page.getByRole('heading', { name: /Не нашли/ })).toBeVisible()
    await expect(page.getByText('Открыли каталог')).toHaveCount(0)

    await page.context().clearCookies()
    await signInViaApi(page, adminPhone(testInfo))
    await page.goto('/insights')
    await expect(page.getByRole('heading', { name: /Воронки/ })).toBeVisible()
    await expect(page.getByText('Открыли каталог')).toBeVisible()

    await page.getByRole('tablist', { name: 'Сценарий' }).getByRole('tab', { name: 'Вход' }).click()
    await page.getByRole('combobox', { name: 'Шрифт в браузере' }).click()
    await page.getByRole('option', { name: 'Очень крупный' }).click()
    const steps = page.getByRole('region', { name: /Шаги/ })
    await expect(steps.getByText('Открыли вход')).toBeVisible()
    await expect(steps.getByText('Получили код')).toBeVisible()
    await expect(page.getByText('Телефон', { exact: true }).first()).toBeVisible()
    await testInfo.attach('insights', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
})
