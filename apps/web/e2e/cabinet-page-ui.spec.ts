import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, type OwnBusiness } from './business'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC',
  'base64',
)
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: TINY_PNG })

const openPage = async (page: Page, business: OwnBusiness) => {
  await page.goto(`/manage/${business.slug}?tab=page`)
  await expect(page.locator('[data-page-tab]')).toBeVisible()
}

// The page's tools sit in its head with a mouse and float at the window's foot on phones.
const visibleButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first()

const managed = async (page: Page, business: OwnBusiness) =>
  (await page.request.get(`/api/manage/${business.slug}`)).json()

const readPublic = async (page: Page, business: OwnBusiness) =>
  (await page.request.get(`/api/businesses/${business.slug}`)).json()

test.describe('«Страница»: what the owner changes in place', () => {
  test('the cover is added, replaced from its menu and removed', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const coverUrl = async () => (await managed(page, business)).business.coverUrl as string | null
    await openPage(page, business)

    await page.getByLabel('Файл обложки').setInputFiles(png('cover.png'))
    await expect(page.getByRole('img', { name: 'Обложка' })).toBeVisible()
    await expect.poll(coverUrl).not.toBeNull()
    const first = await coverUrl()

    await page.getByRole('button', { name: 'Обложка', exact: true }).click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('menuitem', { name: 'Заменить обложку' }).click()
    await (await chooser).setFiles(png('cover-2.png'))
    await expect.poll(coverUrl).not.toBe(first)
    await expect.poll(coverUrl).not.toBeNull()

    await page.getByRole('button', { name: 'Обложка', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Удалить обложку' }).click()
    await expect(page.getByText('Обложка удалена')).toBeVisible()
    await expect.poll(coverUrl).toBeNull()
    // The cover's own button, not the checklist's action of the same name.
    await expect(page.getByRole('button', { name: 'Добавить обложку' }).first()).toBeVisible()
    await expect(page.getByRole('img', { name: 'Обложка' })).toHaveCount(0)
  })

  test('«Редактировать» changes the kind and the contacts clients use', async ({
    page,
    browser,
  }) => {
    const business = await createOwnBusiness(page)
    await openPage(page, business)

    await visibleButton(page, 'Редактировать').click()
    const sheet = page.getByRole('dialog', { name: 'Редактировать', exact: true })
    await sheet.getByRole('combobox', { name: 'Чем занимаетесь' }).click()
    await page.getByRole('option', { name: 'Барбершопы' }).click()
    const contacts = sheet.getByRole('region', { name: 'Контакты' })
    await contacts.getByLabel('Телефон').fill('555111222')
    await expect(contacts.getByLabel('Телефон')).toHaveValue('+996 555 111 222')
    await contacts.getByLabel('WhatsApp').fill('700333444')
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(sheet).toHaveCount(0)

    await expect
      .poll(async () => (await readPublic(page, business)).business)
      .toMatchObject({ kind: 'barber', phone: '+996555111222', whatsapp: '+996700333444' })

    const clientContext = await browser.newContext()
    const client = await clientContext.newPage()
    try {
      await client.goto(`/${business.slug}`)
      await expect(client.locator('a[href="tel:+996555111222"]').first()).toBeAttached()
      await expect(client.locator('a[href="https://wa.me/996700333444"]').first()).toBeAttached()
    } finally {
      await clientContext.close()
    }
  })

  test('«+ Акция» on the page adds a promotion and its capsule opens it again', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    await openPage(page, business)
    const promotions = page.getByRole('list', { name: 'Акции' })

    await promotions.getByRole('button', { name: 'Новая акция' }).click()
    const sheet = page.getByRole('dialog', { name: 'Новая акция', exact: true })
    await sheet.getByLabel('Название акции').fill('E2E Утро')
    await sheet.getByLabel('Скидка, %').fill('10')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)

    // As clients read it: weekdays and the default morning hours.
    const capsule = promotions.getByRole('button', { name: '−10% по будням 10:00–12:00' })
    await expect(capsule).toBeVisible()
    const saved = await (await page.request.get(`/api/manage/${business.slug}/promotions`)).json()
    expect(saved).toEqual([expect.objectContaining({ title: 'E2E Утро', percent: 10 })])

    await capsule.click()
    const edit = page.getByRole('dialog', { name: 'Акция', exact: true })
    await expect(edit.getByLabel('Название акции')).toHaveValue('E2E Утро')
    await expect(edit.getByLabel('Скидка, %')).toHaveValue('10')
  })

  test('a master’s photo is added and removed in their sheet', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const photoUrl = async () =>
      (await managed(page, business)).catalog.specialists.find(
        (master: { id: string }) => master.id === business.master.id,
      )?.photoUrl as string | null
    await openPage(page, business)

    await page.getByRole('tab', { name: /Мастера/ }).click()
    await page
      .getByRole('button', { name: new RegExp(business.master.name) })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'Мастер', exact: true })
    await sheet.getByLabel('Фото мастера').setInputFiles(png('master.png'))
    await expect(sheet.getByRole('button', { name: 'Изменить фото' })).toBeVisible()
    await expect.poll(photoUrl).not.toBeNull()

    await sheet.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(sheet.getByRole('button', { name: 'Добавить фото' })).toBeVisible()
    await expect.poll(photoUrl).toBeNull()
  })

  test('a master switched off leaves the public page and the booking form', async ({
    page,
    browser,
  }) => {
    const business = await createOwnBusiness(page, { masters: ['Азамат', 'Бекзат'] })
    await openPage(page, business)

    await page.getByRole('tab', { name: /Мастера/ }).click()
    await page
      .getByRole('button', { name: /Бекзат/ })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'Мастер', exact: true })
    await sheet.getByRole('switch', { name: 'Принимает записи' }).click()
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)

    await expect
      .poll(async () =>
        (await readPublic(page, business)).catalog.specialists.map(
          (master: { name: string }) => master.name,
        ),
      )
      .toEqual(['Азамат'])

    const clientContext = await browser.newContext()
    const client = await clientContext.newPage()
    try {
      await client.goto(`/${business.slug}/book`)
      await client.locator('#step-service').getByRole('radio').first().click()
      // The only master left is chosen for the client.
      await expect(client.locator('#step-specialist')).toContainText('Азамат')
      await expect(client.getByText('Бекзат')).toHaveCount(0)
    } finally {
      await clientContext.close()
    }
  })

  test('a service’s price is changed from its card', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await openPage(page, business)

    await page.getByRole('tab', { name: /Услуги/ }).click()
    await page
      .getByRole('button', { name: /Стрижка/ })
      .first()
      .click()
    const sheet = page.getByRole('dialog', { name: 'Услуга', exact: true })
    await expect(sheet.getByLabel('Цена, сом')).toHaveValue(/1\s?000/)
    await sheet.getByLabel('Цена, сом').fill('1500')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(sheet).toHaveCount(0)

    await expect
      .poll(async () => (await readPublic(page, business)).catalog.services[0]?.price)
      .toBe(1500)
    // The card itself shows the new price as clients will see it.
    await expect(page.locator('[data-page-tab]')).toContainText(/1\s500\s*сом/)
  })
})
