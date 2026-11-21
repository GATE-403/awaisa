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
      // A product set up in «Склад»: bought at 300, sold at 650; ten arrive and their cost
      // goes to the expenses in the same step.
      await page.goto(`/manage/${SLUG}?tab=stock`)
      await page
        .getByRole('button', { name: /Позиция|Добавить позицию/ })
        .first()
        .click()
      const newItem = page.getByRole('dialog', { name: 'Новый расходник' })
      await newItem.getByLabel('Название').fill(PRODUCT)
      await newItem.getByRole('combobox', { name: 'Единица' }).click()
      await page.getByRole('option', { name: 'шт', exact: true }).click()
      await newItem.getByLabel('Цена за единицу, сом').fill('300')
      await newItem.getByRole('switch', { name: 'Продаётся клиентам' }).click()
      await newItem.getByLabel('Цена продажи, сом').fill('650')
      await newItem.getByRole('button', { name: 'Сохранить' }).click()
      await page.getByRole('button', { name: new RegExp(PRODUCT) }).click()
      const itemSheet = page.getByRole('dialog', { name: 'Товар' })
      await itemSheet.getByLabel('Приход').fill('10')
      await expect(
        itemSheet.getByRole('switch', { name: /Записать в расходы · 3 000 сом/ }),
      ).toBeChecked()
      await itemSheet.getByRole('button', { name: 'Принять' }).click()
      await expect(page.getByText('Сумма закупки в «Расходах».')).toBeVisible()
      await itemSheet.getByRole('button', { name: 'Отмена' }).click()
      expect(await product()).toMatchObject({ quantity: 10, isForSale: true, salePrice: 650 })
      expect(await listExpenses()).toContainEqual(
        expect.objectContaining({ category: 'materials', amount: 3000, note: PRODUCT }),
      )

      // The shift opens with the counted cash.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('button', { name: 'Открыть смену' }).last().click()
      const openSheet = page.getByRole('dialog', { name: 'Открыть смену' })
      await openSheet.getByLabel('Сумма, сом').fill('5000')
      await openSheet.getByRole('button', { name: 'Открыть' }).click()
      await expect(page.getByText('Смена открыта')).toBeVisible()
      await expect(page.getByText(/Смена с \d\d:\d\d · в кассе/)).toBeVisible()

      // A visit paid in cash, then two bottles sold with it from «Итог визита».
      const visit = await createPastVisit('E2E Касса Клиент', randomClientPhone(), 1)
      const marked = await page.request.patch(`${manage}/bookings/${visit.booking.id}/outcome`, {
        data: { outcome: 'arrived', paymentMethod: 'cash' },
      })
      expect(marked.ok()).toBe(true)
      const visitPaid = Number((await marked.json()).paidAmount)
      await page.goto(`/manage/${SLUG}?tab=schedule&date=${visit.date}&booking=${visit.booking.id}`)
      await page.getByRole('button', { name: /Товары\s*Добавить/ }).click()
      const visitSale = page.getByRole('dialog', { name: 'Товары к визиту' })
      await visitSale.getByLabel(`Сколько: ${PRODUCT}`).fill('2')
      await expect(visitSale.getByText('Итого 1 300 сом, оплата вместе с визитом.')).toBeVisible()
      await visitSale.getByRole('button', { name: 'Продать' }).click()
      await expect(page.getByText('Продано на 1 300 сом')).toBeVisible()
      expect((await product())?.quantity).toBe(8)

      // One bottle sold on its own from «Касса».
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('button', { name: 'Продажа', exact: true }).click()
      const sale = page.getByRole('dialog', { name: 'Продажа' })
      await sale.getByLabel(`Сколько: ${PRODUCT}`).fill('1')
      await sale.getByRole('button', { name: 'Продать' }).click()
      await expect(page.getByText('Продано на 650 сом')).toBeVisible()
      expect((await product())?.quantity).toBe(7)

      // An expense under the owner's own category.
      await page.getByRole('tab', { name: 'Расходы' }).click()
      await page.getByRole('button', { name: 'Расход', exact: true }).click()
      const expense = page.getByRole('dialog', { name: 'Новый расход' })
      await expense.getByRole('combobox', { name: 'Статья расхода' }).click()
      await page.getByRole('option', { name: 'Своя статья…' }).click()
      await expense.getByLabel('Своя статья').fill(CATEGORY)
      await expense.getByLabel('Сумма, сом').fill('1500')
      await expense.getByLabel('Комментарий').fill('E2E расход')
      await expense.getByRole('button', { name: 'Сохранить' }).click()
      await expect(page.getByRole('button', { name: new RegExp(CATEGORY) })).toBeVisible()

      // 200 taken out of the till for water, with the reason.
      await page.getByRole('tab', { name: 'Смена', exact: true }).click()
      await page.getByRole('button', { name: 'Внести или изъять' }).click()
      const move = page.getByRole('dialog', { name: 'Деньги в кассе' })
      await move.getByLabel('Сумма, сом').fill('200')
      await move.getByLabel('Причина').fill('E2E вода')
      await move.getByRole('button', { name: 'Записать' }).click()
      await expect(page.getByText('Изъято', { exact: true }).first()).toBeVisible()
      await expect(page.getByText('E2E вода')).toBeVisible()

      // The till expects the opening cash, the visit's cash and both sales, minus what was
      // taken out; 100 short at closing.
      const shift = (await desk()).open.find((item) => item.branchId === branchId)
      expect(shift).toBeTruthy()
      expect(shift?.expectedCash).toBeGreaterThanOrEqual(5000 + visitPaid + 1300 + 650 - 200)
      await page.getByRole('button', { name: 'Закрыть смену' }).click()
      const closeSheet = page.getByRole('dialog', { name: 'Закрыть смену' })
      await expect(closeSheet.getByText('Наличные за товары')).toBeVisible()
      await expect(closeSheet.getByText('Изъято')).toBeVisible()
      await closeSheet
        .getByLabel('Пересчитано наличных, сом')
        .fill(String((shift?.expectedCash ?? 0) - 100))
      await expect(closeSheet.getByText('Недостача 100 сом.')).toBeVisible()
      await closeSheet.getByLabel('Комментарий').fill('E2E смена')
      await closeSheet.getByRole('button', { name: 'Закрыть' }).click()
      await expect(page.getByText('Смена закрыта')).toBeVisible()
      await expect(closeSheet).toHaveCount(0)
      const closed = (await desk()).closed.find((item) => item.id === shift?.id)
      expect(closed?.difference).toBe(-100)
      await expect(page.getByText('недостача 100 сом').first()).toBeVisible()

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
      await expect(page.getByText('Прибыль', { exact: true })).toBeVisible()
      await expect(page.getByText('Себестоимость товаров')).toBeVisible()

      // Undo the standalone sale: the bottle goes back on the shelf and out of the profit.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('tab', { name: /^Продажи/ }).click()
      await page.getByRole('button', { name: 'Действия с продажей' }).first().click()
      await page.getByRole('menuitem', { name: 'Отменить продажу' }).click()
      await expect(page.getByText('Продажа отменена')).toBeVisible()
      expect((await product())?.quantity).toBe(8)
      expect((await money()).products.find((row) => row.name === PRODUCT)?.quantity).toBe(2)

      // The expense is deleted by holding its button; the profit no longer counts it.
      await page.getByRole('tab', { name: 'Расходы' }).click()
      await page.getByRole('button', { name: new RegExp(CATEGORY) }).click()
      await page
        .getByRole('dialog', { name: 'Расход' })
        .getByRole('button', { name: /Удалить расход/ })
        .click({ delay: 1300 })
      await expect(page.getByText('Расход удалён')).toBeVisible()
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
