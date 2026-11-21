import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { createOwnBusiness, createVisit } from './business'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} сом`

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
            role: 'Мастер',
            serviceIds: azamat.serviceIds,
            commissionPercent: 40,
          },
        })
      ).ok(),
    ).toBe(true)
    const visit = (specialistId: string, daysBack: number) =>
      createVisit({ slug: business.slug, serviceId: business.service.id, specialistId, daysBack })
    // Two visits for Азамат (one paid 1 500 by card, one at the 1 000 price), one for Бекзат.
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
    await expect(page.getByRole('region', { name: 'Выручка' })).toContainText(money(3500))
    const masters = page.getByRole('region', { name: 'Мастера за период' })
    const row = masters.getByRole('button', { name: /Азамат/ })
    await expect(row).toContainText(`2 визита · ${money(2500)}`)
    await expect(row).toContainText(`к выплате ${money(1000)} · 40%`)
    await row.click()
    const sheet = page.getByRole('dialog', { name: 'Азамат' })
    await expect(sheet).toContainText(`2 визита · ${money(2500)}`)
    await expect(sheet.getByText(`40% от ${money(2500)}`)).toBeVisible()
    await expect(sheet.getByText('Начислено')).toBeVisible()
    await expect(sheet).toContainText(money(1000))
    await expect(sheet).toContainText('Стрижка')
    await sheet.getByRole('button', { name: 'Закрыть' }).click()
    await expect(sheet).toHaveCount(0)

    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Скачать CSV' }).click()
    const download = await downloading
    expect(download.suggestedFilename()).toMatch(
      new RegExp(`^${business.slug}-\\d{4}-\\d{2}-\\d{2}-\\d{4}-\\d{2}-\\d{2}\\.csv$`),
    )
    const path = await download.path()
    const csv = await readFile(path, 'utf8')
    expect(csv).toContain(
      '"Мастер";"Визиты";"Выручка";"Процент";"С услуг";"С товаров";"Оклад";"Минимум";"Начислено";"Выплачено";"К выплате"',
    )
    expect(csv).toContain('"Азамат";"2";"2500";"40";"1000";"0";"0";"";"1000";"0";"1000"')
    expect(csv).toContain('"Бекзат";"1";"1000";"";"";"";"";"";"";"";""')
    expect(csv).toContain(`"${paid.date}";"1500";"1"`)
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
    await page.getByRole('button', { name: `Задать цель на ${month.label}` }).click()
    const sheet = page.getByRole('dialog', { name: 'Цель на месяц' })
    // Under 1 000 som is not a goal.
    await sheet.getByLabel('Цель по выручке, сом').fill('900')
    await expect(sheet.getByRole('button', { name: 'Готово' })).toBeDisabled()
    await sheet.getByLabel('Цель по выручке, сом').fill('50000')
    await expect(sheet.getByLabel('Цель по выручке, сом')).toHaveValue(/^50\s000$/)
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(sheet).toHaveCount(0)

    const saved = await readMonth()
    expect(saved.goal).toBe(50_000)
    // The share is of this month's revenue, whatever day the visit fell on.
    const share = Math.round((saved.revenue / 50_000) * 100)
    await expect(
      page.getByText(
        `Цель на ${saved.label}: ${share}% · ${money(saved.revenue)} из ${money(50_000)}`,
      ),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Изменить' }).click()
    await page
      .getByRole('dialog', { name: 'Цель на месяц' })
      .getByRole('button', { name: 'Убрать цель' })
      .click()
    await expect(page.getByRole('button', { name: `Задать цель на ${saved.label}` })).toBeVisible()
    expect((await readMonth()).goal).toBeNull()
  })
})
