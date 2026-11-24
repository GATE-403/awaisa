import { expect, type Page, test } from '@playwright/test'
import {
  bishkekDay,
  createOwnBusiness,
  createVisit,
  type OwnBusiness,
  type Visit,
} from './business'
import { board, visitCard } from './schedule'
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

// A visit's card on the board, found by the client's name in its accessible name.

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
  test('“Columns · Timeline”: the chosen view changes the board and survives a reload', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    const view = page.getByRole('group', { name: 'Schedule view' })
    await expect(view.getByRole('radio', { name: 'Columns' })).toBeChecked()
    await expect(board(page).locator('[data-layout="columns"]').first()).toBeVisible()

    // The segment is a glyph; its label names it in a tooltip.
    await view.getByTitle('Timeline').click()
    await expect(board(page).locator('[data-layout="timeline"]').first()).toBeVisible()
    await expect(board(page).locator('[data-layout="columns"]')).toHaveCount(0)

    await page.reload()
    await expect(
      page.getByRole('group', { name: 'Schedule view' }).getByRole('radio', { name: 'Timeline' }),
    ).toBeChecked()
    await expect(board(page).locator('[data-layout="timeline"]').first()).toBeVisible()
    await expect(board(page).locator('[data-layout="columns"]')).toHaveCount(0)
  })

  test('the day strip opens another day with its visits; “Today” comes back', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент дня', fromDay: 3 })
    const today = bishkekDay()

    await page.goto(scheduleUrl(business))
    const strip = page.getByRole('group', { name: 'Day', exact: true })
    await expect(strip.locator(`[data-day="${today}"]`)).toHaveAttribute('aria-pressed', 'true')
    await expect(visitCard(page, visit.name)).toHaveCount(0)

    await strip.locator(`[data-day="${visit.date}"]`).click()
    await expect(strip.locator(`[data-day="${visit.date}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(visitCard(page, visit.name)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Schedule' })).toContainText('1 booking')

    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(strip.locator(`[data-day="${today}"]`)).toHaveAttribute('aria-pressed', 'true')
    await expect(visitCard(page, visit.name)).toHaveCount(0)
  })

  test('the strip’s load: booked minutes over the day’s capacity, at most 42 days', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
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

  test('a visit opens its inspector; on its day “Arrived” closes it', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент визита', daysBack: 2 })

    await page.goto(scheduleUrl(business, visit.date))
    await visitCard(page, visit.name).click()
    // A popover beside the card with a mouse, a sheet on phones: either way a dialog about it.
    const inspector = page.getByRole('dialog').filter({ hasText: visit.name })
    await expect(inspector).toBeVisible()
    await expect(inspector).toContainText(`Haircut · ${business.master.name}`)
    await expect(inspector).toContainText(/1,000\s*som/)
    await expect(inspector).toContainText(`${visit.time}–${addMinutes(visit.time, 60)}`)

    await inspector.getByText('Arrived', { exact: true }).click()
    await expect.poll(() => outcomeOf(page, business, visit.date, visit.id)).toBe('arrived')
  })

  test('“Everyone came” marks the day’s ended visits; “Undo” opens them again', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const first = await firstVisit(business, { name: 'E2E Первый' })
    const second = await firstVisit(business, { name: 'E2E Второй' })
    expect(second.date).toBe(first.date)
    const date = await moveBack([first, second], 2)
    const unclosedDays = async () =>
      (
        (await (
          await page.request.get(`/api/manage/${business.slug}/bookings/unclosed`)
        ).json()) as { days: { date: string }[] }
      ).days.map((day) => day.date)
    expect(await unclosedDays()).toContain(date)

    await page.goto(scheduleUrl(business, date))
    const bar = page.getByRole('region', { name: 'Unmarked visits' })
    await expect(bar).toContainText('2 visits')
    // Booking into a past day is not offered.
    await expect(page.getByRole('button', { name: 'New booking', exact: true })).toHaveCount(0)
    await bar.getByRole('button', { name: 'Everyone came' }).click()
    await expect(page.getByText('Marked: 2 visits')).toBeVisible()
    await expect
      .poll(async () =>
        (await readSchedule(page, business, date)).bookings.map((item) => item.outcome),
      )
      .toEqual(['arrived', 'arrived'])
    await expect(bar).toHaveCount(0)
    expect(await unclosedDays()).not.toContain(date)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect
      .poll(async () =>
        (await readSchedule(page, business, date)).bookings.map((item) => item.outcome),
      )
      .toEqual([null, null])
    await expect(bar).toContainText('2 visits')
  })

  test('“Share free slots” lists the day’s free windows with the master and a link', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { fromDay: 3 })
    const master = business.master.name

    await page.goto(scheduleUrl(business, visit.date))
    await page.getByRole('button', { name: 'Share free slots' }).click()
    const sheet = page.getByRole('dialog', { name: 'Free slots' })
    const message = sheet.getByRole('region', { name: 'Message for clients' })
    // The rest of the day after the visit is free until closing at 20:00.
    await expect(message).toContainText(`${addMinutes(visit.time, 60)}–20:00 - ${master}`)
    if (visit.time !== '10:00')
      await expect(message).toContainText(`10:00–${visit.time} - ${master}`)
    // The visit's own hour is not offered.
    await expect(message).not.toContainText(`${visit.time}–${addMinutes(visit.time, 60)} -`)
    await expect(message.getByRole('link', { name: /Link/ })).toHaveAttribute(
      'href',
      new RegExp(`/${business.slug}/book\\?date=${visit.date}$`),
    )
  })

  test('“Full width” stretches the board and is kept on the device', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    await expect(board(page)).not.toHaveAttribute('data-wide')

    await page.getByRole('button', { name: 'Full width' }).click()
    await expect(board(page)).toHaveAttribute('data-wide', 'true')
    await expect(page.getByRole('button', { name: 'Normal view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await page.reload()
    await expect(board(page)).toHaveAttribute('data-wide', 'true')
    await page.getByRole('button', { name: 'Normal view' }).click()
    await expect(board(page)).not.toHaveAttribute('data-wide')
  })

  test('a client booking made while the cabinet is open arrives as a “New booking” toast', async ({
    page,
  }) => {
    // The cabinet asks for new bookings every 20 seconds.
    test.setTimeout(60_000)
    const business = await createOwnBusiness(page)
    await page.goto(scheduleUrl(business))
    await expect(page.getByRole('group', { name: 'Day', exact: true })).toBeVisible()

    const visit = await firstVisit(business, { name: 'E2E Новый клиент', fromDay: 2 })
    const toast = page.locator('[role="dialog"][data-type]').filter({ hasText: 'New booking' })
    await expect(toast).toContainText(visit.name, { timeout: 30_000 })
    await expect(toast).toContainText(visit.time)
  })

  test('a right click on a visit offers “Open booking”', async ({ page, isMobile }) => {
    test.skip(isMobile, 'A context menu needs a mouse: on touch screens a long press drags')
    const business = await createOwnBusiness(page)
    const visit = await firstVisit(business, { name: 'E2E Клиент меню', fromDay: 2 })

    await page.goto(scheduleUrl(business, visit.date))
    await visitCard(page, visit.name).click({ button: 'right' })
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Cancel booking' })).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Open booking' }).click()
    await expect(
      page.getByRole('dialog', { name: `Booking: ${visit.name}, ${visit.time}` }),
    ).toBeVisible()
  })
})
