import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

type Branch = { id: string; name: string; isActive: boolean }

// A held «Удалить …» acts after a second: a quick tap only says «Удерживайте».
const HOLD = { delay: 1300 }

const settingsRow = (page: Page, name: RegExp) =>
  page.getByRole('main').getByRole('button', { name }).first()

const readJson = async (page: Page, path: string) => (await page.request.get(path)).json()

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
      isFiscalOn: false,
      failedReceipts: 0,
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
    await expect(row('Касса')).toContainText('Выкл.')

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

  test('in the Android app the search at the foot rides up on the keyboard itself', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The search floats at the foot on phones')
    // The page as the Android app shows it: the app's flag and its message port, kept to read.
    await page.addInitScript(() => {
      const state = window as unknown as { __posted: string[] }
      state.__posted = []
      Object.assign(window, {
        __NATIVE_APP__: { platform: 'android', version: '1.0.0' },
        ReactNativeWebView: { postMessage: (message: string) => state.__posted.push(message) },
      })
    })
    const posted = () =>
      page.evaluate(() => (window as unknown as { __posted: string[] }).__posted.join('\n'))
    const keyboard = (height: number) =>
      page.evaluate((value) => {
        window.dispatchEvent(
          new CustomEvent('awaisa:native', {
            detail: { type: 'keyboard', height: value, duration: 0 },
          }),
        )
      }, height)
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=settings`)
    const search = page
      .getByRole('navigation', { name: 'Настройки' })
      .getByLabel('Поиск по настройкам')
    // Nothing is asked of the app until the field takes focus.
    await expect(search).toBeVisible()
    expect(await posted()).not.toContain('keyboardMode')

    await search.focus()
    await expect.poll(posted).toContain('"mode":"overlay"')
    await keyboard(300)
    const keyboardTop = await page.evaluate(() => window.innerHeight - 300)
    await expect
      .poll(async () => {
        const box = await search.boundingBox()
        return box ? box.y + box.height <= keyboardTop : false
      })
      .toBe(true)

    // Off the field and the keyboard gone, the app resizes the WebView again.
    await search.blur()
    await keyboard(0)
    await expect.poll(posted).toContain('"mode":"resize"')
    await expect
      .poll(async () => {
        const box = await search.boundingBox()
        return box ? box.y > keyboardTop : false
      })
      .toBe(true)
  })

  test('in the Android app a sheet takes the keyboard itself and lifts its field above it', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Sheets slide up from the foot on phones')
    await page.addInitScript(() => {
      const state = window as unknown as { __posted: string[] }
      state.__posted = []
      Object.assign(window, {
        __NATIVE_APP__: { platform: 'android', version: '1.0.0' },
        ReactNativeWebView: { postMessage: (message: string) => state.__posted.push(message) },
      })
    })
    const posted = () =>
      page.evaluate(() => (window as unknown as { __posted: string[] }).__posted.join('\n'))
    const business = await createOwnBusiness(page)
    const created = await page.request.post(`/api/manage/${business.slug}/promotions`, {
      data: { title: 'E2E Клавиатура', kind: 'first_visit', percent: 10 },
    })
    expect(created.ok()).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=promotions`)
    await settingsRow(page, /E2E Клавиатура/).click()
    const sheet = page.getByRole('dialog', { name: 'Акция', exact: true })
    // Open, the sheet leaves the WebView whole.
    await expect.poll(posted).toContain('"mode":"overlay"')

    const field = sheet.getByLabel('Скидка, %')
    await field.focus()
    const keyboardTop = await page.evaluate(() => {
      const height = 360
      window.dispatchEvent(
        new CustomEvent('awaisa:native', { detail: { type: 'keyboard', height, duration: 0 } }),
      )
      return window.innerHeight - height
    })
    await expect
      .poll(async () => {
        const box = await field.boundingBox()
        return box ? box.y + box.height <= keyboardTop : false
      })
      .toBe(true)

    // Closed, the app resizes the WebView again.
    await sheet.getByRole('button', { name: 'Отмена' }).click()
    await expect(sheet).toHaveCount(0)
    await expect.poll(posted).toContain('"mode":"resize"')
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

test.describe('Settings: change and remove what was made', () => {
  test('a promotion is edited and then removed with a held button', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const created = await page.request.post(`/api/manage/${business.slug}/promotions`, {
      data: {
        title: 'E2E Будни',
        kind: 'happy_hours',
        percent: 10,
        weekdays: [0, 1, 2, 3, 4],
        fromMinutes: 600,
        toMinutes: 720,
      },
    })
    expect(created.ok()).toBe(true)
    const list = () => readJson(page, `/api/manage/${business.slug}/promotions`)

    await page.goto(`/manage/${business.slug}?tab=promotions`)
    await settingsRow(page, /E2E Будни/).click()
    const sheet = page.getByRole('dialog', { name: 'Акция', exact: true })
    await sheet.getByLabel('Скидка, %').fill('25')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(settingsRow(page, /E2E Будни/)).toContainText('−25%')
    await expect.poll(async () => (await list())[0]?.percent).toBe(25)

    await settingsRow(page, /E2E Будни/).click()
    await sheet.getByRole('button', { name: 'Удалить акцию' }).click(HOLD)
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('main').getByText('E2E Будни')).toHaveCount(0)
    await expect.poll(list).toEqual([])
  })

  test('a subscription plan is edited and then removed', async ({ page }) => {
    const business = await createOwnBusiness(page)
    expect(
      (
        await page.request.post(`/api/manage/${business.slug}/loyalty/plans`, {
          data: { title: 'E2E Пять стрижек', visits: 5, price: 4000, validDays: 60 },
        })
      ).ok(),
    ).toBe(true)
    const plans = async () =>
      (await readJson(page, `/api/manage/${business.slug}/loyalty`)).plans as {
        title: string
        visits: number
      }[]

    await page.goto(`/manage/${business.slug}?tab=loyalty`)
    await settingsRow(page, /E2E Пять стрижек/).click()
    const sheet = page.getByRole('dialog', { name: 'Абонемент', exact: true })
    await sheet.getByLabel('Визитов').fill('6')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(settingsRow(page, /E2E Пять стрижек/)).toContainText('6 визитов')
    await expect.poll(async () => (await plans())[0]?.visits).toBe(6)

    await settingsRow(page, /E2E Пять стрижек/).click()
    await sheet.getByRole('button', { name: 'Удалить абонемент' }).click(HOLD)
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('main').getByText('E2E Пять стрижек')).toHaveCount(0)
    await expect.poll(plans).toEqual([])
  })

  test('a stock item is edited and then removed', async ({ page }) => {
    const business = await createOwnBusiness(page)
    expect(
      (
        await page.request.post(`/api/manage/${business.slug}/stock`, {
          data: { name: 'E2E Шампунь', unit: 'мл', unitCost: 2 },
        })
      ).ok(),
    ).toBe(true)
    const items = async () =>
      (await readJson(page, `/api/manage/${business.slug}/stock`)) as {
        name: string
        unitCost: number
      }[]

    await page.goto(`/manage/${business.slug}?tab=stock`)
    await settingsRow(page, /E2E Шампунь/).click()
    const sheet = page.getByRole('dialog', { name: 'Расходник', exact: true })
    await sheet.getByLabel('Название').fill('E2E Шампунь мятный')
    await sheet.getByLabel('Цена за единицу, сом').fill('3')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)
    await expect(settingsRow(page, /E2E Шампунь мятный/)).toContainText(/3\s*сом за мл/)
    await expect
      .poll(items)
      .toEqual([expect.objectContaining({ name: 'E2E Шампунь мятный', unitCost: 3 })])

    await settingsRow(page, /E2E Шампунь мятный/).click()
    await sheet.getByRole('button', { name: 'Удалить позицию' }).click(HOLD)
    await expect(sheet).toHaveCount(0)
    await expect.poll(items).toEqual([])
  })

  test('the mailing sheet lists what was already sent', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Получатель',
      daysBack: 3,
      smsConfirmation: true,
    })
    const sent = await page.request.post(`/api/manage/${business.slug}/mailings`, {
      data: { segment: 'all', text: 'E2E Ждём вас снова, {имя}! {ссылка}' },
    })
    expect(sent.ok()).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=clients`)
    await page
      .getByRole('button', { name: 'Рассылка', exact: true })
      .filter({ visible: true })
      .click()
    const sheet = page.getByRole('dialog', { name: 'Рассылка', exact: true })
    const history = sheet.getByRole('region', { name: 'Отправленные' })
    await expect(history).toContainText(/^Отправленные\s*Все · \d+ \S+\s*1 клиент$/)
  })

  test('the owner cannot close their own access; an administrator can be closed', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const staffPhone = randomClientPhone()
    expect(
      (
        await page.request.post(`/api/manage/${business.slug}/members`, {
          data: { phone: staffPhone },
        })
      ).ok(),
    ).toBe(true)
    const members = (await readJson(page, `/api/manage/${business.slug}/members`)) as {
      id: string
      role: string
      phone: string
    }[]
    const owner = members.find((member) => member.phone === business.ownerPhone)
    if (!owner) throw new Error('The owner is on the team')

    const own = await page.request.delete(`/api/manage/${business.slug}/members/${owner.id}`)
    expect(own.status()).toBe(400)
    expect(await own.text()).toContain('Себя удалить нельзя')

    await page.goto(`/manage/${business.slug}?tab=team`)
    const team = page.getByRole('region', { name: 'Сотрудники' })
    await expect(team.getByRole('listitem')).toHaveCount(2)
    await expect(team.getByRole('button', { name: /^Закрыть доступ:/ })).toHaveCount(1)
    await expect(team.getByRole('listitem').filter({ hasText: 'Владелец' })).not.toContainText(
      'Закрыть доступ',
    )
    await expect(
      team.getByRole('listitem').filter({ hasText: 'Владелец' }).getByRole('button'),
    ).toHaveCount(0)
  })

  test('a certificate is looked up by its code with what is left on it, staff too', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const business = await createOwnBusiness(page)
    const issued = await (
      await page.request.post(`/api/manage/${business.slug}/loyalty/certificates`, {
        data: { amount: 3000, recipient: 'E2E Подарок' },
      })
    ).json()
    // Part of it pays a visit.
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Сертификат',
      daysBack: 2,
    })
    expect(
      (
        await page.request.patch(`/api/manage/${business.slug}/bookings/${visit.id}/outcome`, {
          data: { outcome: 'arrived', certificateCode: issued.code, certificateAmount: 1000 },
        })
      ).ok(),
    ).toBe(true)

    const staffPhone = randomClientPhone()
    await page.request.post(`/api/manage/${business.slug}/members`, { data: { phone: staffPhone } })
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Админ Салона')
      // Typed in lower case, as a client may read it out.
      const found = await staff.request.get(
        `/api/manage/${business.slug}/loyalty/certificates/${issued.code.toLowerCase()}`,
      )
      expect(found.status()).toBe(200)
      expect(await found.json()).toMatchObject({ code: issued.code, amount: 3000, balance: 2000 })
      const unknown = await staff.request.get(
        `/api/manage/${business.slug}/loyalty/certificates/ZZZZ9999`,
      )
      expect(unknown.status()).toBe(404)
    } finally {
      await staffContext.close()
    }
  })
})
