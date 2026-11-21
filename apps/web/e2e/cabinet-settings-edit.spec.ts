import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

// A held «Удалить …» acts after a second: a quick tap only says «Удерживайте».
const HOLD = { delay: 1300 }

const settingsRow = (page: Page, name: RegExp) =>
  page.getByRole('main').getByRole('button', { name }).first()

const readJson = async (page: Page, path: string) => (await page.request.get(path)).json()

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
  }) => {
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
