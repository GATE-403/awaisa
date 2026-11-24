import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'

type Item = { id: string; name: string; quantity: number; isLow: boolean }

test.describe('Inventory', () => {
  test('a visit writes its materials off, undo puts them back, analytics shows the cost', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes the business’s stock')
    test.setTimeout(120_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const stock = async () =>
      ((await (await page.request.get(`${manage}/stock`)).json()) as Item[]).find(
        (item) => item.name === 'E2E Краска',
      )
    const business = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    // The service createPastVisit books for the master at index 1.
    const serviceId = business.catalog.specialists[1].serviceIds[0] as string
    const service = business.catalog.services.find((item: { id: string }) => item.id === serviceId)

    try {
      // The cabinet: a new item with a unit cost, a warning level and what the service uses.
      await page.goto(`/manage/${SLUG}?tab=stock`)
      await page
        .getByRole('button', { name: /^(Item|Add item)$/ })
        .first()
        .click()
      const sheet = page.getByRole('dialog', { name: 'New consumable' })
      await sheet.getByLabel('Name').fill('E2E Краска')
      await sheet.getByLabel('Price per unit, som').fill('4')
      await sheet.getByLabel('Minimum stock').fill('60')
      await sheet.getByLabel(`Use: ${service.name}`).fill('50')
      await expect(
        sheet.getByText(`"${service.name}": 200 som of materials per visit.`),
      ).toBeVisible()
      await sheet.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('button', { name: /E2E Краска/ })).toBeVisible()

      // A delivery of 100 ml from the item's sheet.
      await page.getByRole('button', { name: /E2E Краска/ }).click()
      const itemSheet = page.getByRole('dialog', { name: 'Consumable' })
      await itemSheet.getByLabel('Delivery').fill('100')
      await itemSheet.getByRole('button', { name: 'Receive' }).click()
      await expect(page.getByText('Delivery recorded')).toBeVisible()
      await expect(itemSheet.getByText('Stock · 100 ml')).toBeVisible()
      await itemSheet.getByRole('button', { name: 'Cancel' }).click()
      expect(await stock()).toMatchObject({ quantity: 100, isLow: false })

      // The visit arrives: 50 ml written off, the item is now low; saving again does not
      // write off twice; undo puts it back.
      const visit = await createPastVisit('E2E Склад', randomClientPhone(), 1, 3)
      const outcome = (data: Record<string, unknown>) =>
        page.request.patch(`${manage}/bookings/${visit.booking.id}/outcome`, { data })
      expect((await outcome({ outcome: 'arrived' })).ok()).toBe(true)
      expect(await stock()).toMatchObject({ quantity: 50, isLow: true })
      await outcome({ outcome: 'arrived', paymentMethod: 'card' })
      expect((await stock())?.quantity).toBe(50)

      const report = await (await page.request.get(`${manage}/analytics?days=7`)).json()
      expect(report.totals.materialsCost).toBeGreaterThanOrEqual(200)
      expect(report.totals.margin).toBe(report.totals.revenue - report.totals.materialsCost)
      expect(
        report.services.find((item: { id: string }) => item.id === serviceId).materialsCost,
      ).toBeGreaterThanOrEqual(200)

      await outcome({ outcome: null })
      expect((await stock())?.quantity).toBe(100)

      // A stocktake replaces the quantity; the list warns when it is low.
      const item = await stock()
      await page.request.post(`${manage}/stock/${item?.id}/adjust`, { data: { quantity: 20 } })
      await page.reload()
      await expect(page.getByText(/Running low: .*E2E Краска/)).toBeVisible()
    } finally {
      const item = await stock()
      if (item) await page.request.delete(`${manage}/stock/${item.id}`)
    }
  })

  test('guests cannot read the stock', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    const response = await page.request.get(`/api/manage/${SLUG}/stock`)
    expect(response.status()).toBe(401)
  })
})
