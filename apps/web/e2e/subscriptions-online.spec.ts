import { expect, type Page, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL, pickFirstFreeSlot, submitBooking } from './helpers'
import { withDb } from './visits'

const SLUG = 'awaisa-studio'
const PRICE = 2000

type Subscription = { id: string; title: string; visitsLeft: number }
type Slot = { time: string; isAvailable: boolean }

// The test acquirer pays a checkout link (`/pay/<id>?s=<signature>`) through its API.
const payTestCheckout = async (page: Page, url: string) => {
  const { pathname, searchParams } = new URL(url, 'http://localhost')
  const id = pathname.split('/').at(-1)
  const response = await page.request.post(
    `/api/payments/${id}/test-complete?s=${searchParams.get('s')}`,
  )
  expect(response.ok()).toBe(true)
}

test.describe('Subscriptions online', () => {
  test('bought on the place page after the payment, then a visit is booked and paid by it', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it adds a plan to the business')
    test.setTimeout(150_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists[0]
    const serviceId: string = master.serviceIds[0]
    const title = `E2E Абонемент онлайн ${Date.now()}`
    const manage = `/api/manage/${SLUG}`

    // The owner sells a plan online from the cabinet (which also refreshes the public page).
    await page.goto(`/manage/${SLUG}?tab=loyalty`)
    await page.getByRole('button', { name: 'Новый' }).click()
    const planSheet = page.getByRole('dialog', { name: 'Новый абонемент' })
    await planSheet.getByLabel('Название абонемента').fill(title)
    await planSheet.getByLabel('Услуга абонемента').click()
    await page
      .getByRole('option', {
        name: business.catalog.services.find((item: { id: string }) => item.id === serviceId).name,
        exact: true,
      })
      .click()
    await planSheet.getByLabel('Визитов').fill('3')
    await planSheet.getByLabel('Цена абонемента, сом').fill(String(PRICE))
    await planSheet.getByLabel('Продавать онлайн').click()
    await planSheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: new RegExp(title) })).toContainText('Онлайн')
    const overview = await (await page.request.get(`${manage}/loyalty`)).json()
    const plan = overview.plans.find((item: { title: string }) => item.title === title)
    expect(plan.isOnline).toBe(true)

    const clientContext = await browser.newContext()
    const client = await clientContext.newPage()
    const phone = randomClientPhone()
    await signInViaApi(client, phone, 'E2E Клиент абонемента')
    const mine = async () =>
      (await (await client.request.get(`/api/me/subscriptions/${SLUG}`)).json()) as Subscription[]

    try {
      // 1. The place's page: the plan as a row, bought in its sheet through the test checkout.
      await client.goto(`/${SLUG}#subscriptions`)
      const section = client.locator('#subscriptions')
      await section.getByRole('button', { name: new RegExp(title) }).click()
      const sheet = client.getByRole('dialog', { name: 'Абонемент' })
      await sheet
        .getByRole('button', { name: `Купить ${PRICE.toLocaleString('ru-RU')} сом` })
        .click()
      await expect(client).toHaveURL(/\/pay\/[0-9a-f-]+\?s=/)
      await expect(client.getByText('Тестовый режим')).toBeVisible({ timeout: 20_000 })
      // Nothing is issued before the money comes.
      expect((await mine()).some((item) => item.title === title)).toBe(false)
      await client.getByRole('button', { name: /^Оплатить/ }).click()
      await expect(client.getByText(/Абонемент ваш/)).toBeVisible()
      const [bought] = (await mine()).filter((item) => item.title === title)
      expect(bought).toMatchObject({ visitsLeft: 3 })

      // 2. The booking form offers it under «Оплата»; the visit is booked by the subscription.
      await client.goto(`/${SLUG}/book?service=${serviceId}&specialist=${master.id}`)
      await pickFirstFreeSlot(client)
      await client.getByRole('combobox', { name: 'Оплата' }).click()
      await client.getByRole('option', { name: 'Абонементом · осталось 3' }).click()
      await expect(client.getByText('По абонементу').first()).toBeVisible()
      await submitBooking(client)
      await expect(client.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
      const booked = (await (await client.request.get('/api/me/bookings')).json()) as {
        id: string
        isBySubscription?: boolean
        status: string
      }[]
      const visit = booked.find((item) => item.isBySubscription && item.status === 'confirmed')
      expect(visit).toBeTruthy()

      // «Пришёл» alone draws the visit from the subscription (moved into the past first).
      await withDb((db) =>
        db.query(
          `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2),
             "ends_at" = "ends_at" - make_interval(days => $2), "customer_name" = 'E2E Клиент абонемента'
           WHERE "id" = $1`,
          [visit?.id, 500 + Math.floor(Math.random() * 300)],
        ),
      )
      const marked = await (
        await page.request.patch(`${manage}/bookings/${visit?.id}/outcome`, {
          data: { outcome: 'arrived' },
        })
      ).json()
      expect(marked).toMatchObject({ paymentMethod: 'subscription', paidAmount: 0 })
      expect((await mine()).find((item) => item.id === bought?.id)?.visitsLeft).toBe(2)

      // 3. «Купить абонемент и записаться»: the booking waits for the payment, then is paid by it.
      let date = ''
      let time = ''
      for (let offset = 10; offset < 16 && !date; offset += 1) {
        const candidate = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
        const response = await fetch(
          `${API_URL}/availability?serviceId=${serviceId}&specialistId=${master.id}&date=${candidate}`,
        )
        const free = ((await response.json()).slots as Slot[]).find((slot) => slot.isAvailable)
        if (free) {
          date = candidate
          time = free.time
        }
      }
      expect(date).not.toBe('')
      const held = await (
        await client.request.post('/api/bookings', {
          data: {
            serviceId,
            specialistId: master.id,
            date,
            time,
            name: 'E2E Клиент абонемента',
            subscriptionPlanId: plan.id,
          },
        })
      ).json()
      expect(held.checkoutUrl).toMatch(/^\/pay\//)
      expect(held.payment).toMatchObject({ status: 'pending', amount: PRICE })
      await payTestCheckout(client, held.checkoutUrl)
      const confirmed = (
        (await (await client.request.get('/api/me/bookings')).json()) as {
          id: string
          isBySubscription?: boolean
          payment?: unknown
        }[]
      ).find((item) => item.id === held.id)
      expect(confirmed).toMatchObject({ isBySubscription: true, payment: null })
      expect((await mine()).filter((item) => item.title === title)).toHaveLength(2)
    } finally {
      await page.request.delete(`${manage}/loyalty/plans/${plan.id}`)
      await clientContext.close()
    }
  })

  test('a plan not sold online cannot be bought, and buying needs a sign-in', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it adds a plan to the business')
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const title = `E2E Абонемент в салоне ${Date.now()}`
    const plans = await (
      await page.request.post(`${manage}/loyalty/plans`, {
        data: { title, serviceId: null, visits: 5, price: 3000, validDays: 60, isActive: true },
      })
    ).json()
    const plan = plans.find((item: { title: string }) => item.title === title)
    try {
      expect(plan.isOnline).toBe(false)
      const listed = await (await fetch(`${API_URL}/businesses/${SLUG}/subscription-plans`)).json()
      expect(listed.some((item: { id: string }) => item.id === plan.id)).toBe(false)
      const refused = await page.request.post(
        `/api/businesses/${SLUG}/subscription-plans/${plan.id}/order`,
      )
      expect(refused.status()).toBe(404)
      const guest = await fetch(
        `${API_URL}/businesses/${SLUG}/subscription-plans/${plan.id}/order`,
        {
          method: 'POST',
        },
      )
      expect(guest.status).toBe(401)
    } finally {
      await page.request.delete(`${manage}/loyalty/plans/${plan.id}`)
    }
  })
})
