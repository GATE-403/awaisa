import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'

test.describe('Loyalty', () => {
  test('bonuses, a subscription and a certificate pay for visits and come back on undo', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes the business’s loyalty settings')
    test.setTimeout(120_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const before = await (await page.request.get(`${manage}/loyalty`)).json()
    const phone = randomClientPhone()
    const loyaltyOf = async () =>
      (await page.request.get(`${manage}/loyalty/clients/${encodeURIComponent(phone)}`)).json()
    const outcome = (id: string, data: Record<string, unknown>) =>
      page.request.patch(`${manage}/bookings/${id}/outcome`, { data })

    try {
      // The cabinet: bonuses on, a subscription plan, a certificate.
      await page.goto(`/manage/${SLUG}?tab=loyalty`)
      const bonuses = page.getByRole('switch').first()
      if (before.bonusPercent === null) {
        await bonuses.click()
        await expect(page.getByText('Бонусы включены')).toBeVisible()
      }
      await page.getByRole('button', { name: 'Новый' }).click()
      const planSheet = page.getByRole('dialog', { name: 'Новый абонемент' })
      await planSheet.getByLabel('Название абонемента').fill('E2E Абонемент')
      await planSheet.getByLabel('Визитов').fill('3')
      await planSheet.getByLabel('Цена абонемента, сом').fill('2000')
      await planSheet.getByRole('button', { name: 'Сохранить' }).click()
      await expect(page.getByRole('button', { name: /E2E Абонемент/ })).toBeVisible()

      await page.getByRole('button', { name: 'Выпустить' }).click()
      const certSheet = page.getByRole('dialog', { name: 'Сертификат' })
      await certSheet.getByLabel('Сумма сертификата, сом').fill('1000')
      await certSheet.getByLabel('Кому').fill('E2E Подарок')
      await certSheet.getByRole('button', { name: 'Выпустить' }).click()
      await expect(page.getByText(/^Сертификат [A-Z0-9]{8}$/)).toBeVisible()
      const overview = await (await page.request.get(`${manage}/loyalty`)).json()
      const plan = overview.plans.find((item: { title: string }) => item.title === 'E2E Абонемент')
      const certificate = overview.certificates.find(
        (item: { recipient: string }) => item.recipient === 'E2E Подарок',
      )
      const percent = overview.bonusPercent as number

      // A paid visit earns bonuses.
      const first = await createPastVisit('E2E Лояльность', phone, 1)
      expect(
        (
          await outcome(first.booking.id, {
            outcome: 'arrived',
            paidAmount: 1000,
            paymentMethod: 'cash',
          })
        ).ok(),
      ).toBe(true)
      expect((await loyaltyOf()).bonusBalance).toBe(Math.round((1000 * percent) / 100))

      // A sold subscription is revenue the day it is sold, in «Прибыль» and «Акции и лояльность».
      const money = async () =>
        (await (await page.request.get(`${manage}/money?days=7`)).json()) as {
          subscriptionsRevenue: number
          subscriptionsSold: number
          revenue: number
          servicesRevenue: number
          productsRevenue: number
          certificatesRevenue: number
        }
      const report = async () =>
        (await (await page.request.get(`${manage}/analytics?days=7`)).json()).loyalty as {
          subscriptionsSold: number
          subscriptionsRevenue: number
        }
      const moneyBefore = await money()
      const loyaltyBefore = await report()

      // A subscription pays the next visit whole; undo gives the visit back.
      await page.request.post(
        `${manage}/loyalty/clients/${encodeURIComponent(phone)}/subscriptions`,
        { data: { planId: plan.id } },
      )
      const [subscription] = (await loyaltyOf()).subscriptions
      expect(subscription).toMatchObject({ title: 'E2E Абонемент', visitsLeft: 3 })
      // Other workers may sell at the same place, so at least this sale is counted.
      const moneyAfter = await money()
      expect(moneyAfter.subscriptionsRevenue).toBeGreaterThanOrEqual(
        moneyBefore.subscriptionsRevenue + 2000,
      )
      expect(moneyAfter.subscriptionsSold).toBeGreaterThanOrEqual(moneyBefore.subscriptionsSold + 1)
      expect(moneyAfter.revenue).toBe(
        moneyAfter.servicesRevenue +
          moneyAfter.productsRevenue +
          moneyAfter.subscriptionsRevenue +
          moneyAfter.certificatesRevenue,
      )
      const loyaltyAfter = await report()
      expect(loyaltyAfter.subscriptionsRevenue).toBeGreaterThanOrEqual(
        loyaltyBefore.subscriptionsRevenue + 2000,
      )
      await page.goto(`/manage/${SLUG}?tab=analytics`)
      await expect(page.getByText('Абонементы', { exact: true })).toBeVisible()
      const second = await createPastVisit('E2E Лояльность', phone, 1, 40)
      const paid = await (
        await outcome(second.booking.id, { outcome: 'arrived', subscriptionId: subscription.id })
      ).json()
      expect(paid).toMatchObject({ paymentMethod: 'subscription', paidAmount: 0 })
      expect((await loyaltyOf()).subscriptions[0].visitsLeft).toBe(2)
      await outcome(second.booking.id, { outcome: null })
      expect((await loyaltyOf()).subscriptions[0].visitsLeft).toBe(3)

      // A certificate pays part of a visit; the rest is money.
      const withCertificate = await (
        await outcome(second.booking.id, {
          outcome: 'arrived',
          certificateCode: certificate.code,
          certificateAmount: 300,
        })
      ).json()
      expect(withCertificate.paidAmount).toBe(
        withCertificate.price - (withCertificate.discount?.amount ?? 0) - 300,
      )
      const after = await (
        await page.request.get(`${manage}/loyalty/certificates/${certificate.code}`)
      ).json()
      expect(after.balance).toBe(700)
    } finally {
      await page.request.put(`${manage}/loyalty/settings`, {
        data: { bonusPercent: before.bonusPercent ?? null },
      })
    }
  })
})
