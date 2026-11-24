import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

const money = (value: number) => `${new Intl.NumberFormat('en-GB').format(value)} som`

test.describe('Cabinet analytics: goal, export and masters', () => {
  test('a master row opens their period; the CSV carries the same numbers', async ({ page }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, { masters: ['Азамат', 'Бекзат'] })
    const [azamat, bekzat] = business.masters
    if (!azamat || !bekzat) throw new Error('Two masters expected')
    // Азамат keeps 40% of what his visits earn.
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${azamat.id}`, {
          data: {
            name: azamat.name,
            role: 'Specialist',
            serviceIds: azamat.serviceIds,
            commissionPercent: 40,
          },
        })
      ).ok(),
    ).toBe(true)
    const visit = (specialistId: string, daysBack: number) =>
      createVisit({ slug: business.slug, serviceId: business.service.id, specialistId, daysBack })
    // Two visits for Азамат (one paid 1,500 by card, one at the 1,000 price), one for Бекзат.
    const paid = await visit(azamat.id, 1)
    await visit(azamat.id, 2)
    await visit(bekzat.id, 3)
    expect(
      (
        await page.request.patch(`/api/manage/${business.slug}/bookings/${paid.id}/outcome`, {
          data: { outcome: 'arrived', paidAmount: 1500, paymentMethod: 'card' },
        })
      ).ok(),
    ).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    await expect(page.getByRole('region', { name: 'Revenue' })).toContainText(money(3500))
    const masters = page.getByRole('region', { name: 'Specialists for the period' })
    const row = masters.getByRole('button', { name: /Азамат/ })
    await expect(row).toContainText(`2 visits · ${money(2500)}`)
    await expect(row).toContainText(`due ${money(1000)} · 40%`)
    // Pay sits in the masters' list: “due” on the row and the total under it.
    await expect(page.getByText(/^Total due/)).toBeVisible()
    await row.click()
    const sheet = page.getByRole('dialog', { name: 'Азамат' })
    await expect(sheet).toContainText(`2 visits · ${money(2500)}`)
    await expect(sheet.getByText(`40% of ${money(2500)}`)).toBeVisible()
    await expect(sheet.getByText('Earned')).toBeVisible()
    await expect(sheet).toContainText(money(1000))
    await expect(sheet).toContainText('Haircut')
    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toHaveCount(0)

    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download CSV' }).click()
    const download = await downloading
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^${business.slug}-\\d{4}-\\d{2}-\\d{2}-\\d{4}-\\d{2}-\\d{2}\\.csv$`),
    )
    const path = await download.path()
    const csv = await readFile(path, 'utf8')
    expect(csv).toContain(
      '"Specialist";"Visits";"Revenue";"Percent";"From services";"From products";"Salary";"Minimum";"Earned";"Paid out";"Due"',
    )
    expect(csv).toContain('"Азамат";"2";"2500";"40";"1000";"0";"0";"";"1000";"0";"1000"')
    expect(csv).toContain('"Бекзат";"1";"1000";"";"";"";"";"";"";"";""')
    expect(csv).toContain(`"${paid.date}";"1500";"1"`)
  })

  test('the report follows the period; only the owner reads it, only offered periods', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const manage = `/api/manage/${business.slug}`
    const report = await (await page.request.get(`${manage}/analytics?days=7`)).json()
    expect(report.daily).toHaveLength(7)
    expect(report.previousDaily).toHaveLength(7)
    expect((await page.request.get(`${manage}/analytics?days=12`)).status()).toBe(400)

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    await expect(page.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const period = page.getByRole('group', { name: 'Period' })
    await period.getByText('Week').click()
    await expect(period.getByRole('radio', { name: 'Week' })).toBeChecked()

    await page.context().clearCookies()
    await signInViaApi(page, randomClientPhone())
    expect((await page.request.get(`${manage}/analytics`)).status()).toBe(403)
  })

  test('the month’s goal is set in its sheet, shows against the revenue and can be removed', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      daysBack: 1,
    })
    const readMonth = async () =>
      (await (await page.request.get(`/api/manage/${business.slug}/analytics?days=30`)).json())
        .month

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    const month = await readMonth()
    expect(month.goal).toBeNull()
    await page.getByRole('button', { name: `Set a goal for ${month.label}` }).click()
    const sheet = page.getByRole('dialog', { name: 'Monthly goal' })
    // Under 1,000 som is not a goal.
    await sheet.getByLabel('Revenue goal, som').fill('900')
    await expect(sheet.getByRole('button', { name: 'Done' })).toBeDisabled()
    await sheet.getByLabel('Revenue goal, som').fill('50000')
    await expect(sheet.getByLabel('Revenue goal, som')).toHaveValue('50,000')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(sheet).toHaveCount(0)

    const saved = await readMonth()
    expect(saved.goal).toBe(50_000)
    // The share is of this month's revenue, whatever day the visit fell on.
    const share = Math.round((saved.revenue / 50_000) * 100)
    await expect(
      page.getByText(
        `Goal for ${saved.label}: ${share}% · ${money(saved.revenue)} of ${money(50_000)}`,
      ),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Change' }).click()
    await page
      .getByRole('dialog', { name: 'Monthly goal' })
      .getByRole('button', { name: 'Remove goal' })
      .click()
    await expect(page.getByRole('button', { name: `Set a goal for ${saved.label}` })).toBeVisible()
    expect((await readMonth()).goal).toBeNull()
  })
})
