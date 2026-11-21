import { expect, type Page, test } from '@playwright/test'
import {
  bishkekDay,
  createOwnBusiness,
  createVisit,
  type OwnBusiness,
  type Visit,
} from './business'
import { withDb } from './visits'

type ScheduleBooking = { id: string; outcome: string | null; customerName: string }

const scheduleUrl = (business: OwnBusiness, date?: string) =>
  `/manage/${business.slug}?tab=schedule${date ? `&date=${date}` : ''}`

const readSchedule = async (page: Page, business: OwnBusiness, date: string) =>
  (await (await page.request.get(`/api/manage/${business.slug}/schedule?date=${date}`)).json()) as {
    bookings: ScheduleBooking[]
  }

const outcomeOf = async (page: Page, business: OwnBusiness, date: string, id: string) =>
  (await readSchedule(page, business, date)).bookings.find((booking) => booking.id === id)
    ?.outcome ?? null

const board = (page: Page) => page.locator('[data-schedule-board]')

// A visit's card on the board, found by the client's name in its accessible name.
const visitCard = (page: Page, name: string) =>
  board(page).getByRole('button', { name: new RegExp(`, ${name}, `) })

const addMinutes = (time: string, minutes: number) => {
  const [hours = 0, mins = 0] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Several visits of one day moved into the past together: booked ahead first (so the second takes
// the next free time, not the one the first left behind), then shifted back by the same days.
const moveBack = async (visits: Visit[], daysBack: number) => {
  const target = bishkekDay(-daysBack)
  for (const visit of visits) {
    const shift = Math.round((Date.parse(visit.date) - Date.parse(target)) / 86_400_000)
    await withDb((client) =>
      client.query(
        `UPDATE "bookings" SET "starts_at" = "starts_at" - make_interval(days => $2),
           "ends_at" = "ends_at" - make_interval(days => $2) WHERE "id" = $1`,
        [visit.id, shift],
      ),
    )
  }
  return target
}

const firstVisit = (business: OwnBusiness, options: Partial<Parameters<typeof createVisit>[0]>) =>
  createVisit({
    slug: business.slug,
    serviceId: business.service.id,
    specialistId: business.master.id,
    ...options,
  })

test.describe('Cabinet schedule', () => {
  test('«Колонки · Лента»: the chosen view changes the board and survives a reload', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    const view = page.getByRole('group', { name: 'Вид расписания' })
    await expect(view.getByRole('radio', { name: 'Колонки' })).toBeChecked()
    await expect(board(page).locator('[data-layout="columns"]').first()).toBeVisible()

    // The segment is a glyph; its label names it in a tooltip.
    await view.getByTitle('Лента').click()
    await expect(board(page).locator('[data-layout="timeline"]').first()).toBeVisible()
    await expect(board(page).locator('[data-layout="columns"]')).toHaveCount(0)

    await page.reload()
    await expect(
      page.getByRole('group', { name: 'Вид расписания' }).getByRole('radio', { name: 'Лента' }),
    ).toBeChecked()
    await expect(board(page).locator('[data-layout="timeline"]').first()).toBeVisible()
    await expect(board(page).locator('[data-layout="columns"]')).toHaveCount(0)
  })

  test('the day strip opens another day with its visits; «Сегодня» comes back', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент дня', fromDay: 3 })
    const today = bishkekDay()

    await page.goto(scheduleUrl(business))
    const strip = page.getByRole('group', { name: 'День' })
    await expect(strip.locator(`[data-day="${today}"]`)).toHaveAttribute('aria-pressed', 'true')
    await expect(visitCard(page, visit.name)).toHaveCount(0)

    await strip.locator(`[data-day="${visit.date}"]`).click()
    await expect(strip.locator(`[data-day="${visit.date}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(visitCard(page, visit.name)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Расписание' })).toContainText('1 запись')

    await page.getByRole('button', { name: 'Сегодня', exact: true }).click()
    await expect(strip.locator(`[data-day="${today}"]`)).toHaveAttribute('aria-pressed', 'true')
    await expect(visitCard(page, visit.name)).toHaveCount(0)
  })

  test('the strip’s load: booked minutes over the day’s capacity, at most 42 days', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { fromDay: 2 })
    const response = await page.request.get(
      `/api/manage/${business.slug}/schedule/load?from=${visit.date}&days=2`,
    )
    expect(response.ok()).toBe(true)
    const [booked, empty] = (await response.json()) as {
      date: string
      minutes: number
      capacity: number
    }[]
    // One master, 10:00 to 20:00 by default; one 60-minute visit on the first day only.
    expect(booked).toEqual({ date: visit.date, minutes: 60, capacity: 600 })
    expect(empty).toMatchObject({ minutes: 0, capacity: 600 })

    const tooLong = await page.request.get(
      `/api/manage/${business.slug}/schedule/load?from=${visit.date}&days=43`,
    )
    expect(tooLong.status()).toBe(400)
  })

  test('a visit opens its inspector; on its day «Пришёл» closes it', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент визита', daysBack: 2 })

    await page.goto(scheduleUrl(business, visit.date))
    await visitCard(page, visit.name).click()
    // A popover beside the card with a mouse, a sheet on phones: either way a dialog about it.
    const inspector = page.getByRole('dialog').filter({ hasText: visit.name })
    await expect(inspector).toBeVisible()
    await expect(inspector).toContainText(`Стрижка · ${business.master.name}`)
    await expect(inspector).toContainText(/1\s000\s*сом/)
    await expect(inspector).toContainText(`${visit.time}–${addMinutes(visit.time, 60)}`)

    await inspector.getByText('Пришёл', { exact: true }).click()
    await expect.poll(() => outcomeOf(page, business, visit.date, visit.id)).toBe('arrived')
  })

  test('«Все пришли» marks the day’s ended visits; «Вернуть» opens them again', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const first = await firstVisit(business, { name: 'E2E Первый' })
    const second = await firstVisit(business, { name: 'E2E Второй' })
    expect(second.date).toBe(first.date)
    const date = await moveBack([first, second], 2)

    await page.goto(scheduleUrl(business, date))
    const bar = page.getByRole('region', { name: 'Неотмеченные визиты' })
    await expect(bar).toContainText('2 визита')
    await bar.getByRole('button', { name: 'Все пришли' }).click()
    await expect(page.getByText('Отмечено: 2 визита')).toBeVisible()
    await expect
      .poll(async () =>
        (await readSchedule(page, business, date)).bookings.map((item) => item.outcome),
      )
      .toEqual(['arrived', 'arrived'])
    await expect(bar).toHaveCount(0)

    await page.getByRole('button', { name: 'Вернуть' }).click()
    await expect
      .poll(async () =>
        (await readSchedule(page, business, date)).bookings.map((item) => item.outcome),
      )
      .toEqual([null, null])
    await expect(bar).toContainText('2 визита')
  })

  test('«Поделиться свободными окнами» lists the day’s free windows with the master and a link', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { fromDay: 3 })
    const master = business.master.name

    await page.goto(scheduleUrl(business, visit.date))
    await page.getByRole('button', { name: 'Поделиться свободными окнами' }).click()
    const sheet = page.getByRole('dialog', { name: 'Свободные окна' })
    const message = sheet.getByRole('region', { name: 'Сообщение для клиентов' })
    // The rest of the day after the visit is free until closing at 20:00.
    await expect(message).toContainText(`${addMinutes(visit.time, 60)}–20:00 — ${master}`)
    if (visit.time !== '10:00')
      await expect(message).toContainText(`10:00–${visit.time} — ${master}`)
    // The visit's own hour is not offered.
    await expect(message).not.toContainText(`${visit.time}–${addMinutes(visit.time, 60)} —`)
    await expect(message.getByRole('link', { name: /Ссылка/ })).toHaveAttribute(
      'href',
      new RegExp(`/${business.slug}/book\\?date=${visit.date}$`),
    )
  })

  test('«На всю ширину» stretches the board and is kept on the device', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    await expect(board(page)).not.toHaveAttribute('data-wide')

    await page.getByRole('button', { name: 'На всю ширину' }).click()
    await expect(board(page)).toHaveAttribute('data-wide', 'true')
    await expect(page.getByRole('button', { name: 'Обычный вид' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await page.reload()
    await expect(board(page)).toHaveAttribute('data-wide', 'true')
    await page.getByRole('button', { name: 'Обычный вид' }).click()
    await expect(board(page)).not.toHaveAttribute('data-wide')
  })

  test('a client booking made while the cabinet is open arrives as a «Новая запись» toast', async ({
    page,
  }) => {
    // The cabinet asks for new bookings every 20 seconds.
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    await expect(page.getByRole('group', { name: 'День' })).toBeVisible()

    const visit = await firstVisit(business, { name: 'E2E Новый клиент', fromDay: 2 })
    const toast = page.locator('[role="dialog"][data-type]').filter({ hasText: 'Новая запись' })
    await expect(toast).toContainText(visit.name, { timeout: 30_000 })
    await expect(toast).toContainText(visit.time)
  })

  test('a right click on a visit offers «Открыть запись»', async ({ page, isMobile }) => {
    test.skip(isMobile, 'A context menu needs a mouse: on touch screens a long press drags')
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент меню', fromDay: 2 })

    await page.goto(scheduleUrl(business, visit.date))
    await visitCard(page, visit.name).click({ button: 'right' })
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Отменить запись' })).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Открыть запись' }).click()
    await expect(
      page.getByRole('dialog', { name: `Запись: ${visit.name}, ${visit.time}` }),
    ).toBeVisible()
  })
})
