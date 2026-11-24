import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

// Loyalty and stock are spent through a visit's outcome and must come back exactly when the
// outcome is undone, however the owner gets there. Everything runs on a business of the test's
// own: one 1 000 som service, bonuses at 10%, a product the service uses two of per visit.
const PRICE = 1000
const BONUS_PERCENT = 10
const USE_PER_VISIT = 2
const STOCK = 10

type Setup = {
  business: OwnBusiness
  phone: string
  itemId: string
  manage: string
}

const setUp = async (page: Page): Promise<Setup> => {
  const business = await createOwnBusiness(page, {
    services: [{ name: 'Haircut', durationMinutes: 60, price: PRICE }],
  })
  const manage = `/api/manage/${business.slug}`
  const settings = await page.request.put(`${manage}/loyalty/settings`, {
    data: { bonusPercent: BONUS_PERCENT },
  })
  expect(settings.ok()).toBe(true)
  const created = await page.request.post(`${manage}/stock`, {
    data: {
      name: 'E2E Краска',
      unit: 'pcs',
      unitCost: 50,
      materials: [{ serviceId: business.service.id, amount: USE_PER_VISIT }],
    },
  })
  const [item] = (await created.json()) as { id: string }[]
  if (!item) throw new Error('No stock item')
  await page.request.post(`${manage}/stock/${item.id}/receive`, { data: { quantity: STOCK } })
  return { business, phone: randomClientPhone(), itemId: item.id, manage }
}

const pastVisit = (setup: Setup, daysBack: number) =>
  createVisit({
    slug: setup.business.slug,
    serviceId: setup.business.service.id,
    specialistId: setup.business.master.id,
    name: 'E2E Лояльность',
    phone: setup.phone,
    daysBack,
  })

const outcome = (page: Page, setup: Setup, id: string, data: Record<string, unknown>) =>
  page.request.patch(`${setup.manage}/bookings/${id}/outcome`, { data })

const loyaltyOf = async (page: Page, setup: Setup) =>
  (await (
    await page.request.get(`${setup.manage}/loyalty/clients/${encodeURIComponent(setup.phone)}`)
  ).json()) as {
    bonusBalance: number
    subscriptions: { id: string; visitsLeft: number }[]
    certificates: { code: string; balance: number }[]
  }

const stockLeft = async (page: Page, setup: Setup) => {
  const items = (await (await page.request.get(`${setup.manage}/stock`)).json()) as {
    id: string
    quantity: number
  }[]
  return items.find((item) => item.id === setup.itemId)?.quantity
}

const certificateBalance = async (page: Page, setup: Setup, code: string) =>
  (await (await page.request.get(`${setup.manage}/loyalty/certificates/${code}`)).json())
    .balance as number

test.describe('Loyalty and stock come back when a visit is undone', () => {
  test('bonuses, a certificate and money pay one visit; saving it again spends nothing twice; a no-show gives it all back', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    test.setTimeout(90_000)
    const setup = await setUp(page)
    const issued = await page.request.post(`${setup.manage}/loyalty/certificates`, {
      data: { amount: 1000, recipient: 'E2E Подарок', phone: setup.phone },
    })
    const { code } = (await issued.json()) as { code: string }

    // A first visit paid in cash earns 10% and uses two of the product.
    const first = await pastVisit(setup, 3)
    expect((await outcome(page, setup, first.id, { outcome: 'arrived' })).ok()).toBe(true)
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(100)
    expect(await stockLeft(page, setup)).toBe(STOCK - USE_PER_VISIT)

    // The second visit: 300 from the certificate, all 100 bonuses, the rest by card.
    const second = await pastVisit(setup, 2)
    const paidWith = {
      outcome: 'arrived',
      certificateCode: code,
      certificateAmount: 300,
      bonusAmount: 100,
      paymentMethod: 'card',
    }
    const paid = await (await outcome(page, setup, second.id, paidWith)).json()
    expect(paid).toMatchObject({ outcome: 'arrived', paidAmount: 600, paymentMethod: 'card' })
    // 100 − 100 spent + 60 earned on the 600 paid in money.
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(60)
    expect(await certificateBalance(page, setup, code)).toBe(700)
    expect(await stockLeft(page, setup)).toBe(STOCK - 2 * USE_PER_VISIT)

    // The same outcome saved again: nothing is drawn a second time, and the 60 left is not
    // asked for the 100 already spent.
    const resaved = await outcome(page, setup, second.id, paidWith)
    expect(resaved.status()).toBe(200)
    const again = await resaved.json()
    expect(again).toMatchObject({ paidAmount: 600, paymentMethod: 'card' })
    expect(await certificateBalance(page, setup, code)).toBe(700)
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(60)
    expect(await stockLeft(page, setup)).toBe(STOCK - 2 * USE_PER_VISIT)

    // It turns out the client never came: the certificate, the bonuses and the product return,
    // and the visit's own earned bonuses go.
    const missed = await (await outcome(page, setup, second.id, { outcome: 'no_show' })).json()
    expect(missed).toMatchObject({ outcome: 'no_show', paidAmount: null, paymentMethod: null })
    expect(await certificateBalance(page, setup, code)).toBe(1000)
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(100)
    expect(await stockLeft(page, setup)).toBe(STOCK - USE_PER_VISIT)
  })

  test('a subscription pays a visit whole and earns nothing; back to “Waiting” gives the visit back', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    test.setTimeout(60_000)
    const setup = await setUp(page)
    const plans = await (
      await page.request.post(`${setup.manage}/loyalty/plans`, {
        data: { title: 'E2E Три визита', serviceId: null, visits: 3, price: 2500, validDays: 90 },
      })
    ).json()
    await page.request.post(
      `${setup.manage}/loyalty/clients/${encodeURIComponent(setup.phone)}/subscriptions`,
      { data: { planId: plans[0].id } },
    )
    const [subscription] = (await loyaltyOf(page, setup)).subscriptions
    if (!subscription) throw new Error('No subscription sold')
    expect(subscription.visitsLeft).toBe(3)

    const visit = await pastVisit(setup, 2)
    const paid = await (
      await outcome(page, setup, visit.id, { outcome: 'arrived', subscriptionId: subscription.id })
    ).json()
    expect(paid).toMatchObject({ paidAmount: 0, paymentMethod: 'subscription' })
    let loyalty = await loyaltyOf(page, setup)
    expect(loyalty.subscriptions[0]?.visitsLeft).toBe(2)
    // Nothing was paid in money, so nothing is earned.
    expect(loyalty.bonusBalance).toBe(0)
    expect(await stockLeft(page, setup)).toBe(STOCK - USE_PER_VISIT)

    // Saved again with the same subscription: still one visit used.
    await outcome(page, setup, visit.id, { outcome: 'arrived', subscriptionId: subscription.id })
    expect((await loyaltyOf(page, setup)).subscriptions[0]?.visitsLeft).toBe(2)

    const waiting = await (await outcome(page, setup, visit.id, { outcome: null })).json()
    expect(waiting).toMatchObject({ outcome: null, paidAmount: null, paymentMethod: null })
    loyalty = await loyaltyOf(page, setup)
    expect(loyalty.subscriptions[0]?.visitsLeft).toBe(3)
    expect(await stockLeft(page, setup)).toBe(STOCK)
  })

  test('“All arrived” earns bonuses and writes the product off once; “Undo” takes both back', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    test.setTimeout(60_000)
    const setup = await setUp(page)
    const first = await pastVisit(setup, 2)
    const second = await pastVisit(setup, 2)
    expect(second.date).toBe(first.date)

    const closed = await (
      await page.request.post(`${setup.manage}/bookings/close-day`, { data: { date: first.date } })
    ).json()
    expect([...closed.ids].sort()).toEqual([first.id, second.id].sort())
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(2 * 100)
    expect(await stockLeft(page, setup)).toBe(STOCK - 2 * USE_PER_VISIT)

    // A second press finds nothing left to mark and changes nothing.
    const twice = await (
      await page.request.post(`${setup.manage}/bookings/close-day`, { data: { date: first.date } })
    ).json()
    expect(twice.ids).toEqual([])
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(2 * 100)
    expect(await stockLeft(page, setup)).toBe(STOCK - 2 * USE_PER_VISIT)

    const reopened = await page.request.post(`${setup.manage}/bookings/reopen`, {
      data: { ids: closed.ids },
    })
    expect(reopened.ok()).toBe(true)
    expect((await loyaltyOf(page, setup)).bonusBalance).toBe(0)
    expect(await stockLeft(page, setup)).toBe(STOCK)
    const day = await (await page.request.get(`${setup.manage}/schedule?date=${first.date}`)).json()
    expect(day.bookings.map((booking: { outcome: string | null }) => booking.outcome)).toEqual([
      null,
      null,
    ])
  })
})
