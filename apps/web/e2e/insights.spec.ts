import { expect, type Page, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { bookingSteps, pickFirstFreeSlot, submitBooking } from './helpers'

// Fills whatever the open booking form still asks and books; returns the channel it sent.
const finishBooking = async (page: Page) => {
  const steps = bookingSteps(page)
  const service = steps.service.getByRole('radio').first()
  if (await service.isVisible()) await service.click()
  const anyMaster = steps.specialist.getByRole('radio', { name: /Любой мастер/ })
  if (await anyMaster.isVisible()) await anyMaster.click()
  await pickFirstFreeSlot(page)
  await steps.contacts.getByLabel('Имя').fill('E2E Тест')
  await steps.contacts.getByLabel('Телефон').fill(randomClientPhone().replace('+996', ''))
  const request = page.waitForRequest(
    (sent) => sent.method() === 'POST' && new URL(sent.url()).pathname === '/api/bookings',
  )
  await submitBooking(page)
  return (await request).postDataJSON().channel as string | undefined
}

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

  test('a booking keeps where it came from: the catalog and the salon’s own link apart', async ({
    browser,
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it books')
    const fromLink = await browser.newPage()
    await fromLink.goto('/awaisa-studio/book?service=pedicure')
    expect(await finishBooking(fromLink)).toBe('salon_link')
    await fromLink.close()

    const fromCatalog = await browser.newPage()
    await fromCatalog.goto('/')
    // A service card of the grid itself; «Для вас» above it is a channel of its own.
    await fromCatalog
      .locator('section[aria-labelledby="results-title"] a[href*="/book?service="]')
      .first()
      .click()
    await expect(fromCatalog).toHaveURL(/\/book\?service=/)
    expect(await finishBooking(fromCatalog)).toBe('catalog')
    await fromCatalog.close()

    await signInViaApi(page, adminPhone(testInfo))
    const report = await (await page.request.get('/api/telemetry/strategy?days=7')).json()
    const count = (channel: string) =>
      report.channels.find((item: { channel: string }) => item.channel === channel)?.bookings ?? 0
    expect(count('salon_link')).toBeGreaterThan(0)
    expect(count('catalog')).toBeGreaterThan(0)
    expect(report.activeBusinesses).toHaveLength(1)

    await page.goto('/insights')
    const channels = page.getByRole('region', { name: /Откуда записи/ })
    await expect(channels.getByText('Ссылка салона')).toBeVisible()
    await expect(channels.getByText('Каталог')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Стратегия' })).toContainText('Записались снова')

    await page.context().clearCookies()
    await signInViaApi(page, randomClientPhone())
    expect((await page.request.get('/api/telemetry/strategy?days=7')).status()).toBe(403)
  })
})
