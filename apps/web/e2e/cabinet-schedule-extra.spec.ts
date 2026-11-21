import { type CDPSession, expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit, type OwnBusiness, type Visit } from './business'
import { withDb } from './visits'

type ScheduleBooking = {
  id: string
  status: string
  time: string
  specialistId: string
  customerName: string
}

const readBooking = async (page: Page, business: OwnBusiness, date: string, id: string) => {
  const schedule = await (
    await page.request.get(`/api/manage/${business.slug}/schedule?date=${date}`)
  ).json()
  return (schedule.bookings as ScheduleBooking[]).find((booking) => booking.id === id)
}

const book = (business: OwnBusiness, name: string) =>
  createVisit({
    slug: business.slug,
    serviceId: business.service.id,
    specialistId: business.master.id,
    name,
  })

// A visit moved to another time of its day, keeping its length.
const placeAt = async (visit: Visit, time: string) => {
  await withDb((client) =>
    client.query(
      `UPDATE "bookings" SET "ends_at" = $2::timestamptz + ("ends_at" - "starts_at"),
         "starts_at" = $2::timestamptz WHERE "id" = $1`,
      [visit.id, `${visit.date}T${time}:00+06:00`],
    ),
  )
  return { ...visit, time }
}

const board = (page: Page) => page.locator('[data-schedule-board]')

const visitCard = (page: Page, name: string) =>
  board(page).getByRole('button', { name: new RegExp(`, ${name}, `) })

const showTimeline = async (page: Page) => {
  await page.getByRole('group', { name: 'Вид расписания' }).getByTitle('Лента').click()
  await expect(board(page).locator('div[data-layout="timeline"]').first()).toBeVisible()
}

test.describe('Schedule: more on a visit and the day', () => {
  test('«⋯» in the inspector: the client card, copying the number, cancelling with «Вернуть»', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const business = await createOwnBusiness(page)
    const visit = await book(business, 'E2E Клиент меню')
    await page.goto(`/manage/${business.slug}?tab=schedule&date=${visit.date}`)

    const openMenu = async () => {
      await visitCard(page, visit.name).click()
      const inspector = page.getByRole('dialog').filter({ hasText: visit.name })
      await inspector.getByRole('button', { name: 'Ещё действия' }).click()
      return page.getByRole('menu')
    }

    const menu = await openMenu()
    const digits = visit.phone.replace(/^\+996(\d{3})(\d{3})(\d{3})$/, '+996 $1 $2 $3')
    await menu.getByRole('menuitem', { name: `Скопировать ${digits}` }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(visit.phone)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog').filter({ hasText: visit.name })).toHaveCount(0)

    await (await openMenu()).getByRole('menuitem', { name: 'Карточка клиента' }).click()
    const card = page.getByRole('dialog', { name: 'Клиент' })
    await expect(card).toContainText(visit.name)
    await expect(card).toContainText(digits)
    await card.getByRole('button', { name: 'Готово' }).click()
    await expect(card).toHaveCount(0)

    await (await openMenu()).getByRole('menuitem', { name: 'Отменить запись' }).click()
    await expect
      .poll(async () => (await readBooking(page, business, visit.date, visit.id))?.status)
      .toBe('cancelled')
    await page.getByRole('button', { name: 'Вернуть' }).click()
    await expect
      .poll(async () => (await readBooking(page, business, visit.date, visit.id))?.status)
      .toBe('confirmed')
  })

  test('a cancelled visit ahead offers «Записать снова» with everything filled in', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const visit = await book(business, 'E2E Отменивший')
    expect(
      (await page.request.post(`/api/manage/${business.slug}/bookings/${visit.id}/cancel`)).ok(),
    ).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=schedule&date=${visit.date}`)
    await visitCard(page, visit.name).click()
    const inspector = page.getByRole('dialog').filter({ hasText: visit.name })
    await expect(inspector).toContainText('Запись отменена')
    await inspector.getByRole('button', { name: 'Записать снова' }).click()
    const dialog = page.getByRole('dialog', { name: 'Новая запись' })
    await expect(dialog.getByRole('combobox', { name: 'Мастер' })).toContainText(
      business.master.name,
    )
    await expect(dialog.getByRole('combobox', { name: 'Услуга' })).toContainText(
      business.service.name,
    )
    await expect(dialog.getByRole('combobox', { name: 'Время' })).toContainText(visit.time)
    await expect(dialog.getByPlaceholder('Как зовут')).toHaveValue(visit.name)
    await expect(dialog.getByPlaceholder('+996 555 123 456')).toHaveValue(
      visit.phone.replace(/^\+996(\d{3})(\d{3})(\d{3})$/, '+996 $1 $2 $3'),
    )
  })

  test('the timeline zooms with − and +, the hours growing wider', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Phones zoom with two fingers: the − / + capsule is hidden there')
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=schedule`)
    await showTimeline(page)
    const grid = board(page).locator('div[data-layout="timeline"]').first()
    const widthAt100 = (await grid.boundingBox())?.width ?? 0

    await expect(board(page).getByRole('button', { name: 'Уменьшить масштаб' })).toBeDisabled()
    await board(page).getByRole('button', { name: 'Увеличить масштаб' }).click()
    await expect(board(page).getByText('150%')).toBeVisible()
    await expect
      .poll(async () => (await grid.boundingBox())?.width ?? 0)
      .toBeGreaterThan(widthAt100 * 1.4)

    await board(page).getByRole('button', { name: 'Уменьшить масштаб' }).click()
    await expect(board(page).getByText('100%')).toBeVisible()
    await expect
      .poll(async () => Math.round((await grid.boundingBox())?.width ?? 0))
      .toBe(Math.round(widthAt100))
  })

  test('an edge tab lists the visits beyond the view and glides to the one picked', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const morning = await book(business, 'E2E Утро')
    const late = await placeAt(await book(business, 'E2E Вечер'), '17:30')
    const last = await placeAt(await book(business, 'E2E Последний'), '19:00')
    expect(morning.time).toBe('10:00')

    // The timeline is the saved view: it opens at the day's start.
    await page.addInitScript(() => localStorage.setItem('awaisa:schedule-view:v1', 'timeline'))
    await page.goto(`/manage/${business.slug}?tab=schedule&date=${morning.date}`)
    await expect(board(page).locator('div[data-layout="timeline"]').first()).toBeVisible()
    await expect(visitCard(page, morning.name)).toBeInViewport()
    await expect(visitCard(page, last.name)).not.toBeInViewport()

    // Two visits beyond the right edge: the nearest one's time and «+1».
    const tab = board(page).getByRole('button', { name: `${late.time} +1 — 2 записи позже` })
    // The tab sits flush with the view's right edge, so a pixel of it may lie past the edge (CI's
    // Linux scrollbars): a plain click would scroll the day to show it whole, and the visits it
    // points to would come into view and take it away. A person presses what they see: the
    // tab's middle, once the lanes have slid into place.
    let box = await tab.boundingBox()
    await expect
      .poll(async () => {
        const next = await tab.boundingBox()
        const isStill = Boolean(box && next && Math.abs(next.x - box.x) < 0.5)
        box = next
        return isStill
      })
      .toBe(true)
    if (!box) throw new Error('The edge tab is not on screen')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.getByRole('menuitem', { name: new RegExp(last.name) }).click()
    await expect(visitCard(page, last.name)).toBeInViewport()
    await expect(visitCard(page, last.name)).toHaveAttribute('data-flash', '')
  })

  test('switching to «Лента» on a day ahead opens the timeline at the day’s start', async ({
    page,
  }) => {
    // It used to read the columns' scale as a zoom and open half way through the day, the
    // morning's visits out of sight.
    const business = await createOwnBusiness(page)
    const morning = await book(business, 'E2E Ранний')
    await page.goto(`/manage/${business.slug}?tab=schedule&date=${morning.date}`)
    await expect(visitCard(page, morning.name)).toBeVisible()
    await showTimeline(page)
    await expect(visitCard(page, morning.name)).toBeInViewport()
  })

  test('a sideways swipe on a phone turns to the next day', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Swiping is a touch gesture')
    const business = await createOwnBusiness(page)
    const visit = await book(business, 'E2E Свайп')
    await page.goto(`/manage/${business.slug}?tab=schedule&date=${visit.date}`)
    await expect(visitCard(page, visit.name)).toBeVisible()
    const strip = page.getByRole('group', { name: 'День' })
    const next = await strip
      .locator(`[data-day="${visit.date}"] ~ [data-day]`)
      .first()
      .getAttribute('data-day')

    // The day's scroller gets a finger moving right to left: the columns fit, so the day turns.
    await visitCard(page, visit.name).evaluate((card) => {
      let scroller = card.parentElement
      while (scroller && getComputedStyle(scroller).overflow.includes('visible')) {
        scroller = scroller.parentElement
      }
      if (!scroller) throw new Error('No scroller around the card')
      const touch = (x: number) =>
        new Touch({ identifier: 1, target: scroller as Element, clientX: x, clientY: 400 })
      scroller.dispatchEvent(
        new TouchEvent('touchstart', { touches: [touch(320)], changedTouches: [touch(320)] }),
      )
      scroller.dispatchEvent(
        new TouchEvent('touchend', { touches: [], changedTouches: [touch(120)] }),
      )
    })
    await expect(strip.locator(`[data-day="${next}"]`)).toHaveAttribute('aria-pressed', 'true')
    await expect(visitCard(page, visit.name)).toHaveCount(0)
  })

  test('a long press drags a visit to another time on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'A long press is a touch gesture; the mouse drag is in platform.spec.ts')
    const business = await createOwnBusiness(page)
    const visit = await book(business, 'E2E Долгое нажатие')
    await page.goto(`/manage/${business.slug}?tab=schedule&date=${visit.date}`)
    const card = visitCard(page, visit.name)
    const box = await card.boundingBox()
    if (!box) throw new Error('The card is not on screen')

    const cdp: CDPSession = await page.context().newCDPSession(page)
    const x = box.x + box.width / 2
    const y = box.y + 12
    const touch = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      points: { x: number; y: number }[],
    ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
    await touch('touchStart', [{ x, y }])
    // Held still past the 350 ms long press: the drag starts (a press, not a wait for state).
    await page.waitForTimeout(500)
    // 1.6px a minute in the columns: 192px down is two hours later.
    for (let step = 1; step <= 8; step += 1) await touch('touchMove', [{ x, y: y + step * 24 }])
    await touch('touchEnd', [])

    await expect
      .poll(async () => (await readBooking(page, business, visit.date, visit.id))?.time)
      .toBe('12:00')
  })
})
