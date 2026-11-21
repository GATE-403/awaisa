import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'
import { withDb } from './visits'

const SLUG = 'awaisa-studio'

type Sale = { isOnline: boolean; amounts: number[] }

test.describe('Gift certificates online', () => {
  test('a guest buys one through the test checkout; an unpaid order expires', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes the place’s loyalty settings')
    test.setTimeout(180_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const saleUrl = `/api/manage/${SLUG}/loyalty/certificate-sale`
    const before: Sale = (await (await page.request.get(`/api/manage/${SLUG}/loyalty`)).json())
      .certificateSale
    const guest = await browser.newContext()
    const guestPage = await guest.newPage()

    try {
      // Online with no amounts is refused; off, the owner turns it on in the cabinet.
      const empty = await page.request.put(saleUrl, { data: { isOnline: true, amounts: [] } })
      expect(empty.status()).toBe(400)
      expect(
        (await page.request.put(saleUrl, { data: { isOnline: false, amounts: [] } })).ok(),
      ).toBe(true)
      await page.goto(`/manage/${SLUG}?tab=loyalty`)
      const group = page.getByRole('region', { name: 'Сертификаты онлайн' })
      await group.getByRole('switch').click()
      const amountsSheet = page.getByRole('dialog', { name: 'Суммы' })
      await expect(amountsSheet.getByLabel('Сумма 1, сом')).toHaveValue('1 000')
      await amountsSheet.getByRole('button', { name: 'Готово' }).click()
      await expect(
        group.getByRole('button', { name: /Суммы\s+1 000 · 3 000 · 5 000 сом/ }),
      ).toBeVisible()

      // The guest picks an amount on the place's page and fills who it is for.
      await guestPage.goto(`/${SLUG}`)
      const block = guestPage.getByRole('region', { name: 'Подарочный сертификат' })
      await block.getByRole('button', { name: '3 000 сом' }).click()
      const sheet = guestPage.getByRole('dialog', { name: 'Сертификат' })
      await expect(sheet.getByRole('radio', { name: '3 000 сом' })).toBeChecked()
      await sheet.getByLabel('Имя получателя').fill('E2E Айгуль')
      await sheet.getByLabel('Телефон получателя').fill(randomClientPhone().replace('+996', ''))
      await sheet.getByLabel('Поздравление').fill('С днём рождения!')
      await sheet.getByLabel('Ваше имя').fill('E2E Нурлан')
      const buyer = randomClientPhone()
      await sheet.getByLabel('Ваш телефон').fill(buyer.replace('+996', ''))
      await sheet.getByRole('button', { name: 'Оплатить' }).click()

      // Nothing is issued before the payment; the test checkout pays and issues it.
      await expect(guestPage).toHaveURL(/\/pay\/[0-9a-f-]+\?s=/)
      await expect(guestPage.getByText('Тестовый режим')).toBeVisible({ timeout: 20_000 })
      await expect(guestPage.getByText('Для E2E Айгуль · от E2E Нурлан')).toBeVisible()
      const pending = await withDb((client) =>
        client.query(
          `SELECT "status", "certificate_id" FROM "certificate_orders" WHERE "buyer_phone" = $1`,
          [buyer],
        ),
      )
      expect(pending.rows).toEqual([{ status: 'pending', certificate_id: null }])
      await guestPage.getByRole('button', { name: 'Оплатить 3 000 сом' }).click()
      await expect(guestPage.getByText('Оплачено. Сертификат готов')).toBeVisible()
      await expect(guestPage.getByText('Код сертификата отправили вам и получателю.')).toBeVisible()

      const issued = await withDb((client) =>
        client.query(
          `SELECT o."status", c."amount", c."balance", c."recipient"
           FROM "certificate_orders" o JOIN "gift_certificates" c ON c."id" = o."certificate_id"
           WHERE o."buyer_phone" = $1`,
          [buyer],
        ),
      )
      expect(issued.rows).toEqual([
        { status: 'paid', amount: 3000, balance: 3000, recipient: 'E2E Айгуль' },
      ])
      // The owner sees it among the certificates, and «Прибыль» counts it today.
      await page.reload()
      await expect(page.getByText('E2E Айгуль')).toBeVisible()
      const money = await (await page.request.get(`/api/manage/${SLUG}/money?days=7`)).json()
      expect(money.certificatesRevenue).toBeGreaterThanOrEqual(3000)

      // An amount the place does not sell is refused.
      const order = (amount: number) =>
        fetch(`${API_URL}/businesses/${SLUG}/certificate-orders`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            amount,
            buyerName: 'E2E Нурлан',
            buyerPhone: randomClientPhone(),
          }),
        })
      expect((await order(2500)).status).toBe(400)

      // An order nobody pays runs out: the minute job expires it and /pay says so.
      const unpaid = await (await order(1000)).json()
      expect(unpaid.checkoutUrl).toMatch(/^\/pay\//)
      await withDb((client) =>
        client.query(
          `UPDATE "certificate_orders" SET "due_at" = now() - interval '1 minute' WHERE "id" = $1`,
          [unpaid.id],
        ),
      )
      const paymentUrl = `${API_URL}${unpaid.checkoutUrl.replace('/pay/', '/payments/')}`
      await expect
        .poll(async () => (await (await fetch(paymentUrl)).json()).status, {
          timeout: 100_000,
          intervals: [5_000],
        })
        .toBe('failed')
      expect((await (await fetch(paymentUrl)).json()).order.status).toBe('expired')
      await guestPage.goto(unpaid.checkoutUrl)
      await expect(guestPage.getByText('Время на оплату вышло')).toBeVisible()
      await expect(
        guestPage.getByText('Деньги не списаны. Оформите сертификат снова.'),
      ).toBeVisible()
    } finally {
      await page.request.put(saleUrl, { data: before })
      await guest.close()
    }
  })
})
