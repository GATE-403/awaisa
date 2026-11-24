import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'
const PRODUCT = 'E2E Шампунь'
const CATEGORY = 'E2E Касса'

type Item = {
  id: string
  name: string
  quantity: number
  isForSale: boolean
  salePrice: number | null
}
type Shift = { id: string; branchId: string; expectedCash: number; difference: number | null }
type Desk = {
  open: Shift[]
  closed: Shift[]
  sales: { id: string; isCancelled: boolean; items: { name: string }[] }[]
}
type Money = {
  servicesRevenue: number
  productsRevenue: number
  subscriptionsRevenue: number
  certificatesRevenue: number
  materialsCost: number
  productsCost: number
  expenses: number
  profit: number
  products: { name: string; quantity: number; revenue: number }[]
  expensesByCategory: { category: string; amount: number }[]
}

test.describe('Cash desk', () => {
  test('a shift, products sold with a visit and alone, an expense, the profit and an undo', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it opens the branch’s shift and changes the stock')
    test.setTimeout(150_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const product = async () =>
      ((await (await page.request.get(`${manage}/stock`)).json()) as Item[]).find(
        (item) => item.name === PRODUCT,
      )
    const desk = async () => (await (await page.request.get(`${manage}/cash`)).json()) as Desk
    const money = async () =>
      (await (await page.request.get(`${manage}/money?days=7`)).json()) as Money
    const business = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const branchId = business.business.branches[0].id as string

    // A shift another run left open on this branch would refuse a new one.
    for (const open of (await desk()).open.filter((shift) => shift.branchId === branchId)) {
      await page.request.post(`${manage}/cash/shifts/${open.id}/close`, {
        data: { countedCash: 0, note: 'E2E уборка' },
      })
    }

    // A product another run left behind would be found instead of this run's.
    const stock = (await (await page.request.get(`${manage}/stock`)).json()) as Item[]
    for (const leftover of stock.filter((item) => item.name === PRODUCT)) {
      await page.request.delete(`${manage}/stock/${leftover.id}`)
    }

    // Sales another run made today would add to this run's numbers.
    for (const leftover of (await desk()).sales.filter(
      (sale) => !sale.isCancelled && sale.items.some((line) => line.name === PRODUCT),
    )) {
      await page.request.post(`${manage}/sales/${leftover.id}/cancel`)
    }
    const listExpenses = async () =>
      (
        (await (await page.request.get(`${manage}/expenses?days=7`)).json()) as {
          items: { id: string; category: string; amount: number; note: string | null }[]
        }
      ).items
    for (const leftover of (await listExpenses()).filter(
      (item) => item.category === CATEGORY || item.note === PRODUCT,
    )) {
      await page.request.delete(`${manage}/expenses/${leftover.id}`)
    }

    try {
      // A product set up in “Stock”: bought at 300, sold at 650; ten arrive and their cost
      // goes to the expenses in the same step.
      await page.goto(`/manage/${SLUG}?tab=stock`)
      await page
        .getByRole('button', { name: /^(Item|Add item)$/ })
        .first()
        .click()
      const newItem = page.getByRole('dialog', { name: 'New consumable' })
      await newItem.getByLabel('Name').fill(PRODUCT)
      await newItem.getByRole('combobox', { name: 'Unit' }).click()
      await page.getByRole('option', { name: 'pcs', exact: true }).click()
      await newItem.getByLabel('Price per unit, som').fill('300')
      await newItem.getByRole('switch', { name: 'Sold to clients' }).click()
      await newItem.getByLabel('Sale price, som').fill('650')
      await newItem.getByRole('button', { name: 'Save' }).click()
      await page.getByRole('button', { name: new RegExp(PRODUCT) }).click()
      const itemSheet = page.getByRole('dialog', { name: 'Product' })
      await itemSheet.getByLabel('Delivery').fill('10')
      await expect(
        itemSheet.getByRole('switch', { name: /Record as expense · 3,000 som/ }),
      ).toBeChecked()
      await itemSheet.getByRole('button', { name: 'Receive' }).click()
      await expect(page.getByText('The purchase cost is in “Expenses”.')).toBeVisible()
      await itemSheet.getByRole('button', { name: 'Cancel' }).click()
      expect(await product()).toMatchObject({ quantity: 10, isForSale: true, salePrice: 650 })
      expect(await listExpenses()).toContainEqual(
        expect.objectContaining({ category: 'materials', amount: 3000, note: PRODUCT }),
      )

      // The shift opens with the counted cash.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('button', { name: 'Open shift' }).last().click()
      const openSheet = page.getByRole('dialog', { name: 'Open shift' })
      await openSheet.getByLabel('Amount, som').fill('5000')
      await openSheet.getByRole('button', { name: 'Open' }).click()
      await expect(page.getByText('Shift opened')).toBeVisible()
      await expect(page.getByText(/Shift since \d\d:\d\d · in the till/)).toBeVisible()

      // A visit paid in cash, then two bottles sold with it from “Visit outcome”.
      const visit = await createPastVisit('E2E Касса Клиент', randomClientPhone(), 1)
      const marked = await page.request.patch(`${manage}/bookings/${visit.booking.id}/outcome`, {
        data: { outcome: 'arrived', paymentMethod: 'cash' },
      })
      expect(marked.ok()).toBe(true)
      const visitPaid = Number((await marked.json()).paidAmount)
      await page.goto(`/manage/${SLUG}?tab=schedule&date=${visit.date}&booking=${visit.booking.id}`)
      await page.getByRole('button', { name: /Products\s*Add/ }).click()
      const visitSale = page.getByRole('dialog', { name: 'Products for the visit' })
      await visitSale.getByLabel(`How many: ${PRODUCT}`).fill('2')
      await expect(visitSale.getByText('Total 1,300 som, paid with the visit.')).toBeVisible()
      await visitSale.getByRole('button', { name: 'Sell' }).click()
      await expect(page.getByText(/Sold for 1,300\ssom/)).toBeVisible()
      expect((await product())?.quantity).toBe(8)

      // One bottle sold on its own from “Till”.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('button', { name: 'Sale', exact: true }).click()
      const sale = page.getByRole('dialog', { name: 'Sale' })
      await sale.getByLabel(`How many: ${PRODUCT}`).fill('1')
      await sale.getByRole('button', { name: 'Sell' }).click()
      await expect(page.getByText(/Sold for 650\ssom/)).toBeVisible()
      expect((await product())?.quantity).toBe(7)

      // An expense under the owner's own category.
      await page.getByRole('tab', { name: 'Expenses' }).click()
      await page.getByRole('button', { name: 'Expense', exact: true }).click()
      const expense = page.getByRole('dialog', { name: 'New expense' })
      await expense.getByRole('combobox', { name: 'Expense category' }).click()
      await page.getByRole('option', { name: 'Custom category…' }).click()
      await expense.getByLabel('Custom category').fill(CATEGORY)
      await expense.getByLabel('Amount, som').fill('1500')
      await expense.getByLabel('Comment').fill('E2E расход')
      await expense.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('button', { name: new RegExp(CATEGORY) })).toBeVisible()

      // 200 taken out of the till for water, with the reason.
      await page.getByRole('tab', { name: 'Shift', exact: true }).click()
      await page.getByRole('button', { name: 'Put in or take out' }).click()
      const move = page.getByRole('dialog', { name: 'Cash in the till' })
      await move.getByLabel('Amount, som').fill('200')
      await move.getByLabel('Reason').fill('E2E вода')
      await move.getByRole('button', { name: 'Record' }).click()
      await expect(page.getByText('Taken out', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('E2E вода')).toBeVisible()

      // The till expects the opening cash, the visit's cash and both sales, minus what was
      // taken out; 100 short at closing.
      const shift = (await desk()).open.find((item) => item.branchId === branchId)
      expect(shift).toBeTruthy()
      expect(shift?.expectedCash).toBeGreaterThanOrEqual(5000 + visitPaid + 1300 + 650 - 200)
      await page.getByRole('button', { name: 'Close shift' }).click()
      const closeSheet = page.getByRole('dialog', { name: 'Close shift' })
      await expect(closeSheet.getByText('Cash for products')).toBeVisible()
      await expect(closeSheet.getByText('Taken out')).toBeVisible()
      await closeSheet
        .getByLabel('Cash counted, som')
        .fill(String((shift?.expectedCash ?? 0) - 100))
      await expect(closeSheet.getByText(/Short by 100\ssom\./)).toBeVisible()
      await closeSheet.getByLabel('Comment').fill('E2E смена')
      await closeSheet.getByRole('button', { name: 'Close' }).click()
      await expect(page.getByText('Shift closed')).toBeVisible()
      await expect(closeSheet).toHaveCount(0)
      const closed = (await desk()).closed.find((item) => item.id === shift?.id)
      expect(closed?.difference).toBe(-100)
      await expect(page.getByText(/short by 100\ssom/).first()).toBeVisible()

      // The profit: services and products in, materials, products' cost and expenses out.
      const report = await money()
      expect(report.products.find((row) => row.name === PRODUCT)).toMatchObject({
        quantity: 3,
        revenue: 1950,
      })
      expect(report.expensesByCategory).toContainEqual({ category: CATEGORY, amount: 1500 })
      expect(report.profit).toBeCloseTo(
        report.servicesRevenue +
          report.productsRevenue +
          report.subscriptionsRevenue +
          report.certificatesRevenue -
          report.materialsCost -
          report.productsCost -
          report.expenses,
        2,
      )
      await page.goto(`/manage/${SLUG}?tab=analytics`)
      await expect(page.getByText('Profit', { exact: true })).toBeVisible()
      await expect(page.getByText('Cost of products')).toBeVisible()

      // Undo the standalone sale: the bottle goes back on the shelf and out of the profit.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('tab', { name: /^Sales/ }).click()
      await page.getByRole('button', { name: 'Sale actions' }).first().click()
      await page.getByRole('menuitem', { name: 'Cancel sale' }).click()
      await expect(page.getByText('Sale cancelled')).toBeVisible()
      expect((await product())?.quantity).toBe(8)
      expect((await money()).products.find((row) => row.name === PRODUCT)?.quantity).toBe(2)

      // The expense is deleted by holding its button; the profit no longer counts it.
      await page.getByRole('tab', { name: 'Expenses' }).click()
      await page.getByRole('button', { name: new RegExp(CATEGORY) }).click()
      await page
        .getByRole('dialog', { name: 'Expense' })
        .getByRole('button', { name: /Delete expense/ })
        .click({ delay: 1300 })
      await expect(page.getByText('Expense deleted')).toBeVisible()
      await expect(page.getByRole('button', { name: new RegExp(CATEGORY) })).toHaveCount(0)
      expect(
        (await money()).expensesByCategory.find((row) => row.category === CATEGORY),
      ).toBeUndefined()
    } finally {
      for (const open of (await desk()).open.filter((shift) => shift.branchId === branchId)) {
        await page.request.post(`${manage}/cash/shifts/${open.id}/close`, {
          data: { countedCash: 0, note: 'E2E уборка' },
        })
      }
      const item = await product()
      if (item) await page.request.delete(`${manage}/stock/${item.id}`)
    }
  })

  test('guests cannot read the cash desk or the profit', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    expect((await page.request.get(`/api/manage/${SLUG}/cash`)).status()).toBe(401)
    expect((await page.request.get(`/api/manage/${SLUG}/money?days=30`)).status()).toBe(401)
  })
})
