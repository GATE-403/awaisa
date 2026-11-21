import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'
import { expectGoodDesign } from './design'
import { withDb } from './visits'

type Access = { planKey: string; title: string; status: string; features: string[] }

// The trial running out is a day in the database: the subscription's end moves into the past.
const endTrial = (slug: string) =>
  withDb((client) =>
    client.query(
      `UPDATE "business_subscriptions" SET "trial_ends_at" = now() - interval '1 day'
       WHERE "business_id" = (SELECT "id" FROM "businesses" WHERE "slug" = $1)`,
      [slug],
    ),
  )

test.describe('Business plans', () => {
  test('a new business tries the paid plan, loses it with the trial and pays with the test checkout', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Runs once: the flow is the same on phones')
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page, { masters: ['Азамат', 'Эрлан'] })
    const manage = `/api/manage/${business.slug}`
    const access = async () =>
      ((await (await page.request.get(manage)).json()) as { access: Access }).access

    // The trial opens everything the paid plan has.
    expect(await access()).toMatchObject({ planKey: 'business', status: 'trial' })
    expect((await page.request.get(`${manage}/cash`)).status()).toBe(200)

    await endTrial(business.slug)
    expect(await access()).toMatchObject({ planKey: 'start', status: 'expired', features: [] })

    // One check on the API refuses paid sections and limits, with words the cabinet shows.
    const cash = await page.request.get(`${manage}/cash`)
    expect(cash.status()).toBe(402)
    expect((await cash.json()).message).toBe('Доступно на тарифе «Бизнес»')
    expect((await page.request.get(`${manage}/analytics?days=7`)).status()).toBe(402)
    const third = await page.request.post(`${manage}/specialists`, {
      data: { name: 'Третий', role: 'Мастер', serviceIds: [business.service.id] },
    })
    expect(third.status()).toBe(402)
    expect((await third.json()).message).toBe(
      'На тарифе «Старт» до 2 мастеров. Больше на тарифе «Бизнес»',
    )
    // The day's work stays open on the free plan.
    expect((await page.request.get(`${manage}/clients`)).status()).toBe(200)

    // The cabinet says what the section would give and leads to the plan.
    await page.goto(`/manage/${business.slug}?tab=cash`)
    await expect(page.getByText('Доступно на тарифе «Бизнес»', { exact: true })).toBeVisible()
    await expectGoodDesign(page, 'main')
    await page.getByRole('link', { name: 'Открыть тариф' }).click()
    await expect(page).toHaveURL(/tab=billing/)
    const plan = page.getByRole('region', { name: 'Тариф' })
    await expect(plan.getByText('закончился', { exact: false }).first()).toBeVisible()
    await expect(plan.getByText('2 из 2')).toBeVisible()
    await expectGoodDesign(page, 'main')

    // A month through the built-in test acquirer: 990 сом for two masters.
    await plan.getByRole('button', { name: 'Оплатить 990 сом' }).click()
    await expect(page).toHaveURL(/\/pay\//)
    await expect(page.getByText('Тариф «Бизнес» на 1 месяц')).toBeVisible()
    await page.getByRole('button', { name: /Оплатить 990/ }).click()
    await expect(page.getByText('Оплачено', { exact: true })).toBeVisible()
    await expect(page.getByText(/^Тариф «Бизнес» оплачен до /)).toBeVisible()
    await page.getByRole('link', { name: 'Вернуться в кабинет' }).click()
    await expect(page).toHaveURL(/tab=billing/)
    await expect(page.getByText(/^Бизнес · оплачен до /)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Оплаты' })).toContainText('990')

    expect(await access()).toMatchObject({ planKey: 'business', status: 'active' })
    expect((await page.request.get(`${manage}/cash`)).status()).toBe(200)
  })

  test('platform admins extend a plan by hand; owners cannot', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'API only')
    const business = await createOwnBusiness(page)
    const manage = `/api/manage/${business.slug}`
    await endTrial(business.slug)

    const byOwner = await page.request.post(`${manage}/billing/extend`, {
      data: { planKey: 'business', months: 1 },
    })
    expect(byOwner.status()).toBe(403)

    await page.context().clearCookies()
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const extended = await page.request.post(`${manage}/billing/extend`, {
      data: { planKey: 'business', months: 12 },
    })
    expect(extended.status()).toBe(200)
    expect((await extended.json()).access).toMatchObject({ planKey: 'business', status: 'active' })

    const lifetime = await page.request.post(`${manage}/billing/extend`, {
      data: { planKey: 'business', isLifetime: true },
    })
    expect((await lifetime.json()).access).toMatchObject({ status: 'lifetime', endsAt: null })
  })

  test('businesses from before plans keep everything for good', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get('/api/manage/awaisa-studio')).json()
    expect(managed.access).toMatchObject({ status: 'lifetime', endsAt: null })
    expect(managed.access.features).toContain('cashdesk')
  })

  test('the month’s SMS are counted per master and packs are offered', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const business = await createOwnBusiness(page, { ownerPhone: randomClientPhone() })
    expect(
      (
        await page.request.post(`/api/manage/${business.slug}/billing/checkout`, {
          data: { kind: 'sms', packKey: 'sms500' },
        })
      ).status(),
    ).toBe(200)
    const manage = `/api/manage/${business.slug}`
    // The trial's SMS are 300 per master; this month already used them up.
    await withDb((client) =>
      client.query(
        `INSERT INTO "sms_usage" ("business_id", "month", "sent")
         SELECT "id", date_trunc('month', now() + interval '6 hours')::date, 300
         FROM "businesses" WHERE "slug" = $1`,
        [business.slug],
      ),
    )
    const billing = await (await page.request.get(`${manage}/billing`)).json()
    expect(billing.usage).toMatchObject({ smsSent: 300, smsAllowance: 300 })
    expect(billing.smsPacks[0]).toMatchObject({ size: 500, price: 900 })
  })
})
