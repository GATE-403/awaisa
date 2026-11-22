import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'
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

test.describe('Way into the cabinet and out of it', () => {
  test('«Кабинет» leads in, «‹» back to where it was opened, the business is a switcher', async ({
    page,
  }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/map')
    // The tab bar on phones, the header with a mouse: one tap either way.
    await page.getByRole('link', { name: 'Кабинет' }).locator('visible=true').first().click()
    await expect(page).toHaveURL(/\/manage$/)
    // The row in the list itself: right after the move the map's own rows («Awaisa Studio …»,
    // links to booking) may still be on screen and match a looser query.
    await page
      .getByRole('article', { name: 'Awaisa Studio', exact: true })
      .getByRole('link', { name: /Awaisa Studio/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/manage\/awaisa-studio/)

    // The business opens the rest of the business side.
    await page.getByRole('button', { name: /другие бизнесы и разделы/ }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Воронки' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Новая страница' })).toBeVisible()
    await page.keyboard.press('Escape')

    // «‹» leaves the business side for the page it was entered from, never the list again.
    await page.getByRole('link', { name: 'Назад: Карта' }).click()
    await expect(page).toHaveURL(/\/map$/)
  })

  test('the profile glyph leads out to the catalog', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')
    await page.getByRole('button', { name: /^Профиль/ }).click()
    await page.getByRole('menuitem', { name: 'Каталог' }).click()
    await expect(page).toHaveURL(/:\d+\/$/)
  })
})
