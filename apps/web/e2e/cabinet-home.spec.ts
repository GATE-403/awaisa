import { expect, test } from '@playwright/test'
import { createOwnBusiness, createVisit } from './business'

test.describe('«Мои бизнесы» (/manage)', () => {
  test('a guest is asked to sign in first and comes back here', async ({ page }) => {
    await page.goto('/manage')
    await expect(page).toHaveURL(/\/login\?next=%2Fmanage$/)
  })

  test('one business opens straight into its cabinet; two make a list of rows', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const first = await createOwnBusiness(page)

    await page.goto('/manage')
    await expect(page).toHaveURL(new RegExp(`/manage/${first.slug}$`))

    const second = await createOwnBusiness(page, { ownerPhone: first.ownerPhone })
    const visit = await createVisit({
      slug: first.slug,
      serviceId: first.service.id,
      specialistId: first.master.id,
    })
    // The second page is taken off the catalog: its row says so.
    expect(
      (
        await page.request.patch(`/api/manage/${second.slug}`, { data: { isPublished: false } })
      ).ok(),
    ).toBe(true)

    await page.goto('/manage')
    await expect(page).toHaveURL(/\/manage$/)
    const firstRow = page.getByRole('article', { name: first.name })
    const secondRow = page.getByRole('article', { name: second.name })
    await expect(firstRow).toContainText('Открыта')
    await expect(firstRow).toContainText('Владелец')
    // The next visit, whichever day it falls on, with its time.
    await expect(firstRow).toContainText(new RegExp(`Дальше — .*${visit.time}`))
    await expect(secondRow).toContainText('Скрыта')
    await expect(secondRow).toContainText('Записей впереди нет')

    await expect(secondRow.getByRole('link', { name: `Страница ${second.name}` })).toHaveAttribute(
      'href',
      `/${second.slug}`,
    )
    await expect(page.getByRole('link', { name: 'Новая страница' })).toHaveAttribute(
      'href',
      '/business/new',
    )

    await firstRow
      .getByRole('link', { name: new RegExp(first.name) })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/manage/${first.slug}$`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText(first.name)
  })
})
