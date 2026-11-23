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
  }, testInfo) => {
    test.setTimeout(90_000)
    const first = await createOwnBusiness(page)

    await page.goto('/manage')
    await expect(page).toHaveURL(new RegExp(`/manage/${first.slug}$`))

    const second = await createOwnBusiness(page, { ownerPhone: first.ownerPhone })
    const visit = await createVisit({
      slug: first.slug,
      serviceId: first.service.id,
      specialistId: first.master.id,
    })
    // An ended visit nobody marked: «1 визит без отметки» on the first row.
    await createVisit({
      slug: first.slug,
      serviceId: first.service.id,
      specialistId: first.master.id,
      daysBack: 2,
    })
    // A fourth, ready and published, that nobody has opened yet.
    const fourth = await createOwnBusiness(page, { ownerPhone: first.ownerPhone })
    // A third place still without masters: its row names the step left.
    const thirdSlug = `e2e-setup-${Math.random().toString(36).slice(2, 8)}`
    const third = await page.request.post('/api/businesses', {
      data: {
        name: `E2E Запуск ${thirdSlug.slice(-6)}`,
        slug: thirdSlug,
        kind: 'other',
        address: 'ул. Киевская, 2',
        services: [{ name: 'Стрижка', durationMinutes: 60, price: 1000 }],
      },
    })
    expect(third.ok()).toBe(true)
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
    // Only what is unusual is drawn: «Скрыта», never «Открыта», no role, nothing for zero.
    await expect(firstRow).not.toContainText('Открыта')
    await expect(firstRow).not.toContainText('Владелец')
    // The next visit, whichever day it falls on, with its time.
    await expect(firstRow).toContainText(new RegExp(`Дальше: .*${visit.time}`))
    await expect(secondRow).toContainText('Скрыта')
    await expect(secondRow).not.toContainText('Записей впереди нет')
    await expect(secondRow).not.toContainText('сегодня')

    // Today's figures come with what waits: the owner sees the money, the day's load is a share.
    const attention = await (await page.request.get('/api/me/businesses/attention')).json()
    expect(attention.find((item: { slug: string }) => item.slug === first.slug)).toMatchObject({
      unmarkedVisits: 1,
      todayRevenue: expect.any(Number),
      todayLoad: expect.any(Number),
      setup: { done: 3, total: 3, next: null },
      week: { bookings: 2 },
    })
    expect(attention.find((item: { slug: string }) => item.slug === thirdSlug)).toMatchObject({
      setup: { done: 2, total: 3, next: 'masters' },
    })

    // A quiet row still says where it stands: the step left before clients can book, or a nudge
    // to share a page nobody has opened yet.
    const thirdRow = page.getByRole('article', { name: `E2E Запуск ${thirdSlug.slice(-6)}` })
    await expect(
      thirdRow.getByRole('link', { name: 'Запуск 2 из 3 · Добавьте мастеров' }),
    ).toHaveAttribute('href', `/manage/${thirdSlug}?tab=masters`)
    const fourthRow = page.getByRole('article', { name: fourth.name })
    await expect(fourthRow).toContainText('Поделитесь ссылкой, и придут первые клиенты')
    await expect(
      fourthRow.getByRole('button', { name: `Скопировать ссылку на ${fourth.name}` }),
    ).toBeVisible()
    // Nothing to share on a hidden page, nor on one with visits ahead.
    await expect(secondRow).not.toContainText('Поделитесь ссылкой')
    await expect(firstRow).not.toContainText('Поделитесь ссылкой')

    // What waits is a link to its tab, and that business comes first.
    const unmarked = firstRow.getByRole('link', { name: '1 визит без отметки' })
    await expect(unmarked).toHaveAttribute('href', `/manage/${first.slug}?tab=schedule`)
    await expect(page.getByRole('article').first()).toHaveAccessibleName(first.name)

    // «↗» to the public page lives with a mouse only; phones reach it from the cabinet's bar.
    if (testInfo.project.name === 'desktop') {
      await expect(
        secondRow.getByRole('link', { name: `Страница ${second.name}` }),
      ).toHaveAttribute('href', `/${second.slug}`)
    }
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
    // A platform admin sees every business: the search narrows the list by name.
    await page.getByRole('searchbox', { name: 'Поиск по бизнесам' }).fill('awaisa stud')
    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Новая страница' })).toHaveCount(0)
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
