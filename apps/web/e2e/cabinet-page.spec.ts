import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC',
  'base64',
)

const openPage = async (page: Page, business: OwnBusiness) => {
  await page.goto(`/manage/${business.slug}?tab=page`)
  await expect(page.locator('[data-page-tab]')).toBeVisible()
}

// The page's tools sit in its head with a mouse and float at the window's foot on phones: the
// same names either way, only one copy is visible.
const visibleButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first()

// The first item of a list the test just made: a missing one fails the test where it is read.
const first = <T>(items: T[]): T => {
  const [item] = items
  if (item === undefined) throw new Error('Expected at least one item')
  return item
}

const readPublic = (page: Page, slug: string) => page.request.get(`/api/businesses/${slug}`)

test.describe('Cabinet «Страница»', () => {
  test('«Редактировать» saves the name and the words clients read; switching the page off hides it', async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await openPage(page, business)

    // A bare page names what it lacks; the words are one of them.
    const checklist = page.getByText(/^Добавьте обложку/)
    await expect(checklist).toContainText('пару слов о себе')

    await page.getByRole('button', { name: 'Добавить пару слов о себе' }).click()
    const sheet = page.getByRole('dialog', { name: 'Редактировать' })
    const newName = `${business.name} Плюс`
    await sheet.getByLabel('Название').fill(newName)
    await sheet.getByLabel('Коротко о вас').fill('E2E Стрижём аккуратно и без очереди')
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(sheet).toHaveCount(0)

    await expect(page.locator('[data-page-tab] h2')).toHaveText(newName)
    await expect(page.locator('[data-page-tab]')).toContainText(
      'E2E Стрижём аккуратно и без очереди',
    )
    await expect(checklist).not.toContainText('пару слов о себе')
    await expect
      .poll(async () => (await (await readPublic(page, business.slug)).json()).business)
      .toMatchObject({ name: newName, description: 'E2E Стрижём аккуратно и без очереди' })
    const clientContext = await browser.newContext()
    const client = await clientContext.newPage()
    await client.goto(`/${business.slug}`)
    await expect(client.getByRole('heading', { level: 1, name: newName })).toBeVisible()
    await expect(client.getByText('E2E Стрижём аккуратно и без очереди')).toBeVisible()

    // Off: the cabinet says so, the public API no longer serves it.
    await visibleButton(page, 'Редактировать').click()
    await sheet.getByRole('switch', { name: 'Страница открыта' }).click()
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('Скрыта от клиентов')).toBeVisible()
    await expect.poll(async () => (await readPublic(page, business.slug)).status()).toBe(404)
    await client.goto(`/${business.slug}`)
    await expect(client.getByRole('heading', { level: 1, name: newName })).toHaveCount(0)

    // Back on.
    await visibleButton(page, 'Редактировать').click()
    await expect(sheet.getByRole('switch', { name: 'Страница открыта' })).not.toBeChecked()
    await sheet.getByRole('switch', { name: 'Страница открыта' }).click()
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(page.getByText('Скрыта от клиентов')).toHaveCount(0)
    await expect.poll(async () => (await readPublic(page, business.slug)).status()).toBe(200)
    await clientContext.close()
  })

  test('«Время»: a day off and a longer slot step reach the chart and the free times', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await openPage(page, business)

    await page.getByRole('tab', { name: 'Время' }).click()
    const chart = page.getByRole('list', { name: 'Часы по дням' })
    await expect(chart.getByRole('listitem').filter({ hasText: 'Воскресенье:' })).toContainText(
      '10:00–20:00',
    )

    await visibleButton(page, 'Изменить часы').click()
    const sheet = page.getByRole('dialog', { name: 'Часы работы' })
    await sheet.getByRole('switch', { name: 'Воскресенье: рабочий день' }).click()
    await sheet.getByRole('combobox', { name: 'Шаг записи' }).click()
    await page.getByRole('option', { name: '60 мин' }).click()
    await sheet.getByRole('button', { name: 'Готово' }).click()
    await expect(sheet).toHaveCount(0)

    await expect(chart.getByRole('listitem').filter({ hasText: 'Воскресенье:' })).toContainText(
      'Выходной',
    )
    const managed = await (await page.request.get(`/api/manage/${business.slug}`)).json()
    expect(managed.business.slotMinutes).toBe(60)
    const weekdays = managed.business.hours.map((day: { weekday: number }) => day.weekday)
    expect(weekdays).toEqual([0, 1, 2, 3, 4, 5])

    // Clients get no Sunday and only whole hours.
    const serviceId = business.service.id
    const specialistId = business.master.id
    const dayKey = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000).toISOString().slice(0, 10)
    const offsets = Array.from({ length: 7 }, (_, index) => index + 1)
    const sunday = first(
      offsets.map(dayKey).filter((key) => new Date(`${key}T00:00:00Z`).getUTCDay() === 0),
    )
    const weekday = first(
      offsets.map(dayKey).filter((key) => new Date(`${key}T00:00:00Z`).getUTCDay() === 3),
    )
    const slotsOn = async (date: string) =>
      (
        await (
          await page.request.get(
            `/api/availability?serviceId=${serviceId}&specialistId=${specialistId}&date=${date}`,
          )
        ).json()
      ).slots as { time: string; isAvailable: boolean }[]
    await expect
      .poll(async () => (await slotsOn(sunday)).filter((slot) => slot.isAvailable).length)
      .toBe(0)
    const wednesday = await slotsOn(weekday)
    expect(wednesday.length).toBeGreaterThan(0)
    expect(wednesday.every((slot) => slot.time.endsWith(':00'))).toBe(true)
  })

  test('«За 7 дней» counts the week’s online bookings and page views', async ({ page }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    const visit = {
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
    }
    await createVisit({ ...visit, name: 'E2E Первая' })
    await createVisit({ ...visit, name: 'E2E Вторая' })
    const session = `e2e-${Math.random().toString(36).slice(2, 12)}`
    const sent = await page.request.post('/api/telemetry/events', {
      data: { session, events: [{ step: 'business', slug: business.slug }] },
    })
    expect(sent.status()).toBe(202)

    await expect
      .poll(async () => (await page.request.get(`/api/manage/${business.slug}/page-stats`)).json())
      .toMatchObject({ days: 7, bookings: 2, views: 1 })

    await openPage(page, business)
    const insights = page.getByRole('link', { name: /За 7 дней/ })
    await expect(insights).toHaveText(/За 7 дней:\s*2 записи · 1 просмотр/)
    await insights.click()
    await expect(page).toHaveURL(new RegExp(`/manage/${business.slug}\\?tab=analytics`))
  })

  test('the logo is added from its badge and removed from its menu', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await openPage(page, business)
    const logoUrl = async () =>
      (await (await page.request.get(`/api/manage/${business.slug}`)).json()).business.logoUrl

    await page.getByLabel('Файл логотипа').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.getByText('Логотип обновлён')).toBeVisible()
    await expect.poll(logoUrl).not.toBeNull()

    await page.getByRole('button', { name: 'Логотип', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Удалить логотип' }).click()
    await expect(page.getByText('Логотип удалён')).toBeVisible()
    await expect.poll(logoUrl).toBeNull()
    await expect(page.getByRole('button', { name: 'Добавить логотип' })).toBeVisible()
  })

  test('«Поделиться» shows the page’s QR and address and copies the link', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const business = await createOwnBusiness(page)
    await openPage(page, business)

    await visibleButton(page, 'Поделиться').click()
    const sheet = page.getByRole('dialog', { name: 'Поделиться' })
    const qr = sheet.getByRole('img', { name: `QR-код страницы ${business.name}` })
    await expect(qr).toBeVisible()
    // Dark modules drawn as one path: an empty code would draw nothing.
    expect((await qr.locator('path').getAttribute('d'))?.length ?? 0).toBeGreaterThan(200)
    const pageUrl = `${baseURL}/${business.slug}`
    await expect(sheet).toContainText(pageUrl.replace(/^https?:\/\//, ''))

    await sheet.getByRole('button', { name: 'Скопировать ссылку' }).click()
    await expect(page.getByText('Ссылка на страницу скопирована')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(pageUrl)
  })

  test('«Поставить первой» puts a work photo first in the cabinet and on the public page', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    const upload = async (name: string) => {
      const response = await page.request.post(`/api/manage/${business.slug}/photos`, {
        multipart: { file: { name, mimeType: 'image/png', buffer: TINY_PNG } },
      })
      expect(response.ok()).toBe(true)
    }
    await upload('first.png')
    await upload('second.png')
    const workPhotos = async () =>
      (await (await page.request.get(`/api/manage/${business.slug}/work-photos`)).json()) as {
        id: string
        url: string
      }[]
    const before = await workPhotos()
    expect(before).toHaveLength(2)
    const [, last] = before
    if (!last) throw new Error('Two photos were uploaded')

    await openPage(page, business)
    await page.getByRole('button', { name: /^Фото 2:/ }).click()
    await page.getByRole('button', { name: 'Поставить первой' }).click()
    await expect(page.getByText('Порядок сохранён')).toBeVisible()

    await expect
      .poll(async () => (await workPhotos()).map((photo) => photo.id))
      .toEqual([last.id, first(before).id])
    await expect
      .poll(async () => (await (await readPublic(page, business.slug)).json()).business.photos)
      .toEqual([last.url, first(before).url])
  })
})
