import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

const money = (value: number) => `${new Intl.NumberFormat('en-GB').format(value)} som`

test.describe('Master pay', () => {
  test.skip(({ isMobile }) => isMobile, 'The cabinet sheets are checked on desktop')

  test('a scheme with a service rate and a minimum is counted, paid out and undone; a master sees only their own pay', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page, {
      services: [
        { name: 'Haircut', durationMinutes: 60, price: 1000 },
        { name: 'Beard', durationMinutes: 30, price: 500 },
      ],
      masters: ['Azamat', 'Bekzat'],
    })
    const [azamat, bekzat] = business.masters
    const [cut, beard] = business.services
    if (!azamat || !bekzat || !cut || !beard) throw new Error('Two masters and services expected')
    const manage = `/api/manage/${business.slug}`

    // Azamat: a cut yesterday (1,000 at the price), a beard the day before (500); Bekzat: a cut.
    const cutVisit = await createVisit({
      slug: business.slug,
      serviceId: cut.id,
      specialistId: azamat.id,
      daysBack: 1,
    })
    await createVisit({
      slug: business.slug,
      serviceId: beard.id,
      specialistId: azamat.id,
      daysBack: 2,
    })
    await createVisit({
      slug: business.slug,
      serviceId: cut.id,
      specialistId: bekzat.id,
      daysBack: 1,
    })

    // The owner sets Azamat's pay in the master sheet: 40%, 300 som a beard, 100,000 a month.
    await page.goto(`/manage/${business.slug}?tab=masters`)
    await page
      .getByRole('button', { name: /Azamat/ })
      .first()
      .click()
    await page.getByRole('button', { name: /^Pay\b/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Pay' })
    await sheet.getByLabel('Specialist’s percent').fill('40')
    await sheet.getByRole('button', { name: 'Another rate for a service' }).click()
    await page.getByRole('menuitem', { name: 'Beard' }).click()
    await sheet.getByRole('button', { name: /Beard: percent or amount/ }).click()
    await page.getByRole('menuitem', { name: 'Amount per visit' }).click()
    await sheet.getByLabel('Beard: rate').fill('300')
    await sheet.getByLabel('Minimum per month').fill('100000')
    await expect(sheet).toContainText('discounts, certificates, passes and bonuses lower it')
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Pay for Azamat saved')).toBeVisible()
    expect(await (await page.request.get(`${manage}/specialists/${azamat.id}/pay`)).json()).toEqual(
      {
        percent: 40,
        rates: [{ serviceId: beard.id, kind: 'fixed', value: 300 }],
        salary: null,
        minimum: 100_000,
        productsPercent: null,
      },
    )

    // The calculator: 400 from the cut, 300 from the beard, lifted to the month's minimum.
    const report = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    const row = report.masters.find((item: { id: string }) => item.id === azamat.id)
    expect(row.pay).toMatchObject({ services: 700, salary: 0, earned: 700, paid: 0 })
    expect(row.pay.minimum).toBeGreaterThan(90_000)
    expect(row.pay.total).toBe(row.pay.minimum)
    expect(row.payout).toBe(row.pay.total)
    expect(report.masters.find((item: { id: string }) => item.id === bekzat.id).pay).toBeNull()

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    const masters = page.getByRole('region', { name: 'Specialists for the period' })
    const azamatRow = masters.getByRole('button', { name: /Azamat/ })
    await expect(azamatRow).toContainText(`due ${money(row.pay.total)}`)
    await azamatRow.click()
    const stats = page.getByRole('dialog', { name: 'Azamat' })
    await expect(stats).toContainText('300 som × 1')
    await expect(stats).toContainText(`40% of ${money(1000)}`)
    await expect(stats).toContainText('under the minimum')

    // Marked paid in part, then undone.
    await stats.getByRole('button', { name: /^Mark payout of/ }).click()
    await stats.getByLabel('Payout amount').fill('20000')
    await stats.getByLabel('Payout comment').fill('advance')
    await stats.getByRole('button', { name: /^Pay 20.000 som$/ }).click()
    await expect(page.getByText('Payout marked')).toBeVisible()
    await expect(stats.getByRole('heading', { name: 'Payouts' })).toBeVisible()
    await expect(stats).toContainText(money(row.pay.total - 20_000))
    const paid = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    expect(paid.masters.find((item: { id: string }) => item.id === azamat.id).pay).toMatchObject({
      paid: 20_000,
      due: row.pay.total - 20_000,
    })

    await stats.getByRole('button', { name: `Cancel payout of ${money(20_000)}` }).click()
    await expect(page.getByText('Payout cancelled')).toBeVisible()
    await expect(stats.getByRole('heading', { name: 'Payouts' })).toHaveCount(0)
    const undone = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    expect(undone.masters.find((item: { id: string }) => item.id === azamat.id).pay).toMatchObject({
      paid: 0,
      due: row.pay.total,
      payouts: [],
    })

    // Azamat signs in for «My day»: his own pay only, nothing of the others.
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`${manage}/specialists/${azamat.id}`, {
          data: {
            name: 'Azamat',
            role: 'Specialist',
            serviceIds: azamat.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)
    const masterContext = await browser.newContext()
    const masterPage = await masterContext.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Azamat')
      const day = await (
        await masterPage.request.get(`/api/master/${business.slug}/day?date=${cutVisit.date}`)
      ).json()
      expect(day.pay.day).toBe(400)
      expect(day.pay.month).toBeGreaterThan(0)
      expect(day.master).not.toHaveProperty('commissionPercent')
      expect((await masterPage.request.get(`${manage}/analytics?days=30`)).status()).toBe(403)
      expect(
        (await masterPage.request.get(`${manage}/specialists/${bekzat.id}/pay`)).status(),
      ).toBe(403)

      await masterPage.goto(`/master/${business.slug}`)
      await expect(masterPage.getByText(/^Earned in [A-Za-z]+/)).toBeVisible()
    } finally {
      await masterContext.close()
    }

    // Administrators see no pay at all.
    const staffPhone = randomClientPhone()
    expect(
      (await page.request.post(`${manage}/members`, { data: { phone: staffPhone } })).ok(),
    ).toBe(true)
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Place Admin')
      const cabinet = await (await staff.request.get(manage)).json()
      expect(cabinet.role).toBe('staff')
      expect(cabinet.catalog.specialists[0]).not.toHaveProperty('commissionPercent')
      expect((await staff.request.get(`${manage}/specialists/${azamat.id}/pay`)).status()).toBe(403)
      expect(
        (
          await staff.request.post(`${manage}/payouts`, {
            data: {
              specialistId: azamat.id,
              amount: 1,
              from: cutVisit.date,
              to: cutVisit.date,
              paidOn: cutVisit.date,
            },
          })
        ).status(),
      ).toBe(403)
    } finally {
      await staffContext.close()
    }
  })

  test('a master earns their percent of the products they sold; an undone sale is not counted', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page, {
      services: [{ name: 'Haircut', durationMinutes: 60, price: 1000 }],
      masters: ['Azamat'],
    })
    const [azamat] = business.masters
    if (!azamat) throw new Error('A master expected')
    const manage = `/api/manage/${business.slug}`
    // A visit, so the analytics has a period to show (no services percent: it earns him nothing).
    await createVisit({
      slug: business.slug,
      serviceId: business.services[0]?.id ?? '',
      specialistId: azamat.id,
      daysBack: 1,
    })

    // A shampoo for sale, three on the shelf.
    const created = await (
      await page.request.post(`${manage}/stock`, {
        data: { name: 'E2E Shampoo', unit: 'pcs', unitCost: 400, isForSale: true, salePrice: 1000 },
      })
    ).json()
    const itemId = (created as { id: string; name: string }[]).find(
      (item) => item.name === 'E2E Shampoo',
    )?.id
    if (!itemId) throw new Error('The shampoo expected in the stock')
    expect(
      (
        await page.request.post(`${manage}/stock/${itemId}/receive`, { data: { quantity: 3 } })
      ).ok(),
    ).toBe(true)

    // The owner gives Azamat 10% of the products in the pay sheet.
    await page.goto(`/manage/${business.slug}?tab=masters`)
    await page
      .getByRole('button', { name: /Azamat/ })
      .first()
      .click()
    await page.getByRole('button', { name: /^Pay\b/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Pay' })
    await sheet.getByLabel('Percent of sales').fill('10')
    await expect(sheet).toContainText('the specialist sold in “Till”')
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Pay for Azamat saved')).toBeVisible()

    // Two sold by Azamat, one more sold and undone.
    const sell = (quantity: number) =>
      page.request.post(`${manage}/sales`, {
        data: { sellerId: azamat.id, paymentMethod: 'cash', items: [{ itemId, quantity }] },
      })
    expect((await sell(2)).ok()).toBe(true)
    const undone = await (await sell(1)).json()
    expect((await page.request.post(`${manage}/sales/${undone.id}/cancel`)).ok()).toBe(true)

    const report = await (await page.request.get(`${manage}/analytics?days=7`)).json()
    const row = report.masters.find((item: { id: string }) => item.id === azamat.id)
    expect(row.pay).toMatchObject({ productsSold: 2000, products: 200, earned: 200, total: 200 })

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    await page
      .getByRole('region', { name: 'Specialists for the period' })
      .getByRole('button', { name: /Azamat/ })
      .click()
    await expect(page.getByRole('dialog', { name: 'Azamat' })).toContainText(`sold ${money(2000)}`)
  })
})
