import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness } from './business'

type Branch = { id: string; name: string; isActive: boolean }

test.describe('Cabinet «Настройки»', () => {
  test('each row says what is inside, read from what the business has', async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    const manage = `/api/manage/${business.slug}`
    const staffPhone = randomClientPhone()
    const made = await Promise.all([
      page.request.post(`${manage}/members`, { data: { phone: staffPhone } }),
      page.request.post(`${manage}/promotions`, {
        data: { title: 'E2E Новым', kind: 'first_visit', percent: 10 },
      }),
      page.request.post(`${manage}/promotions`, {
        data: { title: 'E2E Выключена', kind: 'first_visit', percent: 15, isActive: false },
      }),
      // A new item has nothing in stock: under its minimum it is running out.
      page.request.post(`${manage}/stock`, {
        data: { name: 'E2E Краска', unit: 'мл', unitCost: 5, minQuantity: 100 },
      }),
      page.request.post(`${manage}/stock`, {
        data: { name: 'E2E Перчатки', unit: 'шт', unitCost: 10 },
      }),
      page.request.put(`${manage}/loyalty/settings`, { data: { bonusPercent: 7 } }),
    ])
    for (const response of made) expect(response.ok(), await response.text()).toBe(true)

    expect(await (await page.request.get(`${manage}/settings-summary`)).json()).toEqual({
      team: 2,
      telegramChats: 0,
      activePromotions: 1,
      bonusPercent: 7,
      plans: 0,
      stockItems: 2,
      lowStock: 1,
    })

    await page.goto(`/manage/${business.slug}?tab=settings`)
    const nav = page.getByRole('navigation', { name: 'Настройки' })
    const row = (name: string) => nav.getByRole('link', { name: new RegExp(`^${name}`) })
    await expect(row('Склад')).toContainText('1 заканчивается')
    await expect(row('Акции')).toContainText('1 действует')
    await expect(row('Лояльность')).toContainText('Бонусы 7%')
    await expect(row('Сотрудники')).toContainText('2')
    await expect(row('Уведомления')).toContainText('Выкл.')
    await expect(row('Филиалы')).toContainText('1')

    // An administrator runs the day, not the settings.
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Администратор Места')
      expect((await staff.request.get(`${manage}/settings-summary`)).status()).toBe(403)
    } finally {
      await staffContext.close()
    }
  })

  test('the root opens «Филиалы» beside the list with a mouse, the list alone on phones', async ({
    page,
    isMobile,
  }) => {
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=settings`)
    const nav = page.getByRole('navigation', { name: 'Настройки' })
    const branches = page.getByRole('region', { name: 'Филиалы' })
    await expect(nav.getByRole('link', { name: /^Склад/ })).toBeVisible()

    if (isMobile) {
      await expect(branches).toBeHidden()
      await nav.getByRole('link', { name: /^Филиалы/ }).click()
      await expect(page).toHaveURL(/tab=branches/)
      await expect(branches).toBeVisible()
      await page.getByRole('link', { name: 'Назад к настройкам' }).click()
      await expect(page).toHaveURL(/tab=settings/)
      await expect(branches).toBeHidden()
      return
    }

    await expect(branches).toBeVisible()
    await expect(nav.getByRole('link', { name: /^Филиалы/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await nav.getByRole('link', { name: /^Склад/ }).click()
    await expect(page).toHaveURL(/tab=stock/)
    await expect(nav.getByRole('link', { name: /^Склад/ })).toHaveAttribute('aria-current', 'page')
    await expect(branches).toHaveCount(0)
  })

  test('the search finds sections by their words, also those on «Страница»', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=settings`)
    const nav = page.getByRole('navigation', { name: 'Настройки' })
    const search = nav.getByLabel('Поиск по настройкам')
    const found = nav.getByRole('list', { name: 'Найдено' }).getByRole('link')

    await search.fill('склад')
    await expect(found).toHaveCount(1)
    await expect(found.first()).toContainText('Склад')

    // A word that is not in the name: a promo code is a promotion.
    await search.fill('промокод')
    await expect(found).toHaveCount(1)
    await expect(found.first()).toContainText('Акции')

    await search.fill('нечтотакое')
    await expect(nav.getByText('Ничего не нашли')).toBeVisible()

    await search.fill('услуги')
    await expect(found.first()).toContainText('на Странице')
    await found.filter({ hasText: /^Услуги/ }).click()
    await expect(page).toHaveURL(/tab=services/)
    await expect(page.getByRole('tab', { name: /Услуги/ })).toHaveAttribute('aria-selected', 'true')
  })

  test('the only branch can be neither deleted nor closed; a second one is deleted', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const manage = `/api/manage/${business.slug}`
    const branches = async () =>
      (await (await page.request.get(manage)).json()).business.branches as Branch[]
    const [only] = await branches()
    if (!only) throw new Error('A new business has a branch')

    const deleted = await page.request.delete(`${manage}/branches/${only.id}`)
    expect(deleted.status()).toBe(400)
    expect((await deleted.json()).message).toBe('Нельзя удалить единственный филиал')
    const closed = await page.request.put(`${manage}/branches/${only.id}`, {
      data: { name: only.name, isActive: false },
    })
    expect(closed.status()).toBe(400)
    expect((await closed.json()).message).toBe('Нужен хотя бы один открытый филиал')
    expect(await branches()).toEqual([expect.objectContaining({ id: only.id, isActive: true })])

    await page.goto(`/manage/${business.slug}?tab=branches`)
    const list = page.getByRole('region', { name: 'Филиалы' })
    await list.getByRole('button', { name: new RegExp(`^${only.name}`) }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByRole('switch', { name: 'Принимает клиентов' })).toBeChecked()
    await expect(sheet.getByRole('button', { name: 'Удалить филиал' })).toHaveCount(0)
    await sheet.getByRole('button', { name: 'Отмена' }).click()
    await expect(sheet).toHaveCount(0)

    expect(
      (await page.request.post(`${manage}/branches`, { data: { name: 'E2E Второй' } })).ok(),
    ).toBe(true)
    await page.reload()
    await list.getByRole('button', { name: /^E2E Второй/ }).click()
    await sheet.getByRole('button', { name: 'Удалить филиал' }).click({ delay: 1300 })
    await expect(page.getByText('Филиал удалён')).toBeVisible()
    await expect.poll(async () => (await branches()).map((branch) => branch.id)).toEqual([only.id])
    await expect(list.getByRole('button', { name: /^E2E Второй/ })).toHaveCount(0)
  })
})
