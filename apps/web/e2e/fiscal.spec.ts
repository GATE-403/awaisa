import { expect, type Page, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'
const PRODUCT = 'E2E Чек Бальзам'
const INN = '01234567890123'

type Receipt = {
  id: string
  kind: 'sale' | 'refund'
  status: string
  total: number
  payment: 'cash' | 'cashless'
  fiscalNumber: string | null
  inn: string | null
  isTest: boolean
  viewUrl: string
  lines: { name: string; kind: string; sum: number; salesTaxRate: number; vatAmount: number }[]
}
type Sale = { id: string; isCancelled: boolean; items: { name: string }[]; receipt: Receipt | null }
type Settings = {
  driver: string
  isEnabled: boolean
  inn: string | null
  taxRegime: string
  isVatPayer: boolean
  vatRate: number
  salesTaxServices: number
  salesTaxGoods: number
  login: string | null
}

const manage = `/api/manage/${SLUG}`

const settingsOff = {
  isEnabled: false,
  inn: null,
  taxRegime: 'general',
  isVatPayer: false,
  vatRate: 12,
  salesTaxServices: 3,
  salesTaxGoods: 2,
  login: null,
}

// The receipt is sent right after the save, out of the request: wait for it to settle.
const issuedReceipt = async (read: () => Promise<Receipt | null | undefined>) => {
  let receipt: Receipt | null | undefined = null
  await expect
    .poll(
      async () => {
        receipt = await read()
        return receipt?.status
      },
      { timeout: 15_000 },
    )
    .toBe('issued')
  return receipt as unknown as Receipt
}

const saleReceipt = (page: Page, saleId: string) => async () => {
  const sales = (await (await page.request.get(`${manage}/sales`)).json()) as Sale[]
  return sales.find((sale) => sale.id === saleId)?.receipt
}

test.describe('Fiscal receipts', () => {
  test('a sale gets a receipt with a QR and a link, its cancel a refund; a paid visit too', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it switches receipts on for the business')
    test.setTimeout(120_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const branchId = business.business.branches[0].id as string

    // Receipts off and no product left by another run.
    expect((await page.request.put(`${manage}/fiscal`, { data: settingsOff })).ok()).toBe(true)
    const stock = (await (await page.request.get(`${manage}/stock`)).json()) as {
      id: string
      name: string
    }[]
    for (const leftover of stock.filter((item) => item.name === PRODUCT)) {
      await page.request.delete(`${manage}/stock/${leftover.id}`)
    }

    try {
      // “Settings → Till”: the switch asks for the TIN first, then turns receipts on.
      await page.goto(`/manage/${SLUG}?tab=fiscal`)
      await expect(page.getByText('Test mode', { exact: false })).toHaveCount(0)
      await page.getByRole('switch', { name: 'Issue receipts' }).click()
      const sheet = page.getByRole('dialog', { name: 'Till' })
      await expect(sheet.getByRole('button', { name: 'Turn on' })).toBeDisabled()
      await sheet.getByLabel('TIN').fill('1234')
      await expect(sheet.getByText('TIN: 14 digits.')).toBeVisible()
      await sheet.getByLabel('TIN').fill(INN)
      await sheet.getByRole('switch', { name: 'VAT payer' }).click()
      await expect(sheet.getByLabel('Sales tax on services, %')).toHaveValue('2')
      await expect(sheet.getByLabel('Sales tax on goods, %')).toHaveValue('1')
      await sheet.getByRole('button', { name: 'Turn on' }).click()
      await expect(page.getByText('Receipts on')).toBeVisible()
      await expect(page.getByRole('switch', { name: 'Issue receipts' })).toBeChecked()
      await expect(page.getByText(/Test mode: receipts are numbered here/)).toBeVisible()
      await expect(page.getByRole('button', { name: new RegExp(`TIN\\s*${INN}`) })).toBeVisible()
      const settings = (await (await page.request.get(`${manage}/fiscal`)).json()) as Settings
      expect(settings).toMatchObject({
        driver: 'log',
        isEnabled: true,
        inn: INN,
        isVatPayer: true,
        salesTaxServices: 2,
        salesTaxGoods: 1,
      })

      // A product sold by card: the receipt is cashless, with VAT and the goods' sales tax.
      const created = await page.request.post(`${manage}/stock`, {
        data: { name: PRODUCT, unit: 'pcs', unitCost: 300, isForSale: true, salePrice: 1130 },
      })
      expect(created.ok(), await created.text()).toBe(true)
      // The answer is the whole stock list.
      const item = ((await created.json()) as { id: string; name: string }[]).find(
        (entry) => entry.name === PRODUCT,
      ) as { id: string }
      const received = await page.request.post(`${manage}/stock/${item.id}/receive`, {
        data: { quantity: 5 },
      })
      expect(received.ok(), await received.text()).toBe(true)
      const sold = await page.request.post(`${manage}/sales`, {
        data: { branchId, paymentMethod: 'card', items: [{ itemId: item.id, quantity: 1 }] },
      })
      expect(sold.ok(), await sold.text()).toBe(true)
      const sale = (await sold.json()) as Sale
      const receipt = await issuedReceipt(saleReceipt(page, sale.id))
      expect(receipt).toMatchObject({
        kind: 'sale',
        total: 1130,
        payment: 'cashless',
        inn: INN,
        isTest: true,
      })
      expect(receipt.fiscalNumber).toMatch(/^T-[0-9A-F]{10}$/)
      // 1130 = 1000 × (1 + 12% + 1%): VAT 120, sales tax 10.
      expect(receipt.lines).toEqual([
        expect.objectContaining({
          name: PRODUCT,
          kind: 'goods',
          sum: 1130,
          vatAmount: 120,
          salesTaxRate: 1,
        }),
      ])

      // In “Till → Sales” the row names the receipt and “⋯ → Receipt” opens it with a QR.
      await page.goto(`/manage/${SLUG}?tab=cash`)
      await page.getByRole('tab', { name: /Sales/ }).click()
      const row = page.getByRole('listitem').filter({ hasText: PRODUCT })
      await expect(row.getByText(`receipt No. ${receipt.fiscalNumber}`)).toBeVisible()
      await row.getByRole('button', { name: 'Sale actions' }).click()
      await page.getByRole('menuitem', { name: 'Receipt', exact: true }).click()
      const receiptSheet = page.getByRole('dialog', { name: 'Receipt' })
      const paper = receiptSheet.getByRole('article', { name: 'Till receipt' })
      await expect(paper.getByText(`Tax ID ${INN}`)).toBeVisible()
      await expect(paper.getByText(receipt.fiscalNumber as string)).toBeVisible()
      await expect(paper.getByRole('img', { name: 'Receipt QR code' })).toBeVisible()
      await expect(receiptSheet.getByRole('button', { name: 'Copy link' })).toBeVisible()
      await receiptSheet.getByRole('button', { name: 'Close', exact: true }).click()

      // The client's link opens the receipt without signing in; a wrong signature does not.
      const link = new URL(receipt.viewUrl)
      const guest = await page.context().browser()?.newPage()
      if (!guest) throw new Error('No browser')
      await guest.goto(`${link.pathname}${link.search}`)
      await expect(guest.getByRole('heading', { name: 'Receipt', exact: true })).toBeVisible()
      await expect(guest.getByText('incl. VAT 12%')).toBeVisible()
      await expect(guest.getByText(receipt.fiscalNumber as string)).toBeVisible()
      await guest.goto(`${link.pathname}?s=wrong`)
      await expect(guest.getByText("The receipt didn't open")).toBeVisible()
      await guest.close()
      expect((await page.request.get(`/api/fiscal/receipts/${receipt.id}?s=wrong`)).status()).toBe(
        404,
      )

      // Cancelling the sale issues a refund of that receipt.
      await page.request.post(`${manage}/sales/${sale.id}/cancel`)
      const refund = await issuedReceipt(saleReceipt(page, sale.id))
      expect(refund).toMatchObject({ kind: 'refund', total: 1130 })
      expect(refund.id).not.toBe(receipt.id)

      // A visit paid in cash gets a service receipt; marking it “Waiting” again refunds it.
      const visit = await createPastVisit('E2E Чек Клиент', randomClientPhone(), 1)
      const marked = await page.request.patch(`${manage}/bookings/${visit.booking.id}/outcome`, {
        data: { outcome: 'arrived', paymentMethod: 'cash' },
      })
      expect(marked.ok()).toBe(true)
      const paid = Number((await marked.json()).paidAmount)
      const visitReceipts = async () =>
        (
          (await (
            await page.request.get(`${manage}/fiscal/receipts?bookingId=${visit.booking.id}`)
          ).json()) as Receipt[]
        )[0]
      const visitReceipt = await issuedReceipt(visitReceipts)
      expect(visitReceipt).toMatchObject({ kind: 'sale', total: paid, payment: 'cash' })
      expect(visitReceipt.lines[0]).toMatchObject({ kind: 'service', salesTaxRate: 2 })

      // The inspector's “Visit outcome” shows it as a row.
      await page.goto(`/manage/${SLUG}?tab=schedule&date=${visit.date}&booking=${visit.booking.id}`)
      await expect(
        page.getByRole('button', { name: new RegExp(`Receipt\\s*№${visitReceipt.fiscalNumber}`) }),
      ).toBeVisible()

      await page.request.patch(`${manage}/bookings/${visit.booking.id}/outcome`, {
        data: { outcome: null },
      })
      const visitRefund = await issuedReceipt(visitReceipts)
      expect(visitRefund).toMatchObject({ kind: 'refund', total: paid })
    } finally {
      await page.request.put(`${manage}/fiscal`, { data: settingsOff })
      const items = (await (await page.request.get(`${manage}/stock`)).json()) as {
        id: string
        name: string
      }[]
      for (const leftover of items.filter((entry) => entry.name === PRODUCT)) {
        await page.request.delete(`${manage}/stock/${leftover.id}`)
      }
    }
  })

  test('a client outside the business cannot read or change the tax settings', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'One project is enough for an access rule')
    await signInViaApi(page, randomClientPhone(), 'E2E Чужой')
    expect((await page.request.get(`${manage}/fiscal`)).status()).toBe(403)
    expect((await page.request.put(`${manage}/fiscal`, { data: settingsOff })).status()).toBe(403)
  })
})
