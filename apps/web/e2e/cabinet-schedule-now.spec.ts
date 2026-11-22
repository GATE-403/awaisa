import { expect, type Page, test } from '@playwright/test'
import { bishkekDay, createOwnBusiness, type Visit } from './business'
import { board, book, visitCard } from './schedule'
import { withDb } from './visits'

// What the schedule shows about «now» is worked out in the browser (`useToday`): with the page's
// clock fixed at 14:10 Bishkek time today, the visits placed around it are always «in the chair»,
// «next» or «ended», whatever time the suite runs at. The server only stores them.
const NOW = '14:10'

const fixClock = async (page: Page) => {
  await page.clock.setFixedTime(new Date(`${bishkekDay()}T${NOW}:00+06:00`))
}

// A visit moved to a time of a given day, keeping its length.
const placeAt = async (visit: Visit, date: string, time: string) => {
  await withDb((client) =>
    client.query(
      `UPDATE "bookings" SET "ends_at" = $2::timestamptz + ("ends_at" - "starts_at"),
         "starts_at" = $2::timestamptz WHERE "id" = $1`,
      [visit.id, `${date}T${time}:00+06:00`],
    ),
  )
  return { ...visit, date, time }
}

test.describe('Schedule around «now»', () => {
  test('NowBar names who is in the chair and who is next; cards say «Сейчас» and «Не отмечен»', async ({
    page,
    isMobile,
  }) => {
    const business = await createOwnBusiness(page)
    const today = bishkekDay()
    // Booked ahead one after another, then laid out around 14:10 today.
    const ended = await placeAt(await book(business, 'E2E Утренний'), today, '12:00')
    const current = await placeAt(await book(business, 'E2E В кресле'), today, '13:40')
    const next = await placeAt(await book(business, 'E2E Следующий'), today, '15:00')

    await fixClock(page)
    await page.goto(`/manage/${business.slug}?tab=schedule`)

    const now = page.getByRole('region', { name: 'Сейчас' })
    const inChair = now.getByRole('button', { name: new RegExp(`Сейчас: ${current.name}`) })
    // 13:40 + 60 minutes, at 14:10: half an hour left.
    await expect(inChair).toContainText('ещё 30 мин')
    const upNext = now.getByRole('button', { name: new RegExp(`Далее: ${next.time} ${next.name}`) })
    await expect(upNext).toContainText('через 50 минут')
    // With a mouse the next client can be called from the bar (phones keep the row to capsules).
    if (!isMobile) {
      await expect(now.getByRole('link', { name: `Позвонить: ${next.name}` })).toHaveAttribute(
        'href',
        `tel:${next.phone}`,
      )
    }
    // The ended visit is not in the bar.
    await expect(now).not.toContainText(ended.name)

    const currentCard = visitCard(page, current.name)
    await expect(currentCard).toHaveAttribute('data-tone', 'accent')
    await expect(currentCard).toContainText('Сейчас')
    // Half of the visit is done: its fill runs half way.
    await expect(currentCard).toHaveAttribute('style', /--progress:\s*50%/)
    await expect(visitCard(page, ended.name)).toHaveAttribute('data-tone', 'warning')
    await expect(visitCard(page, ended.name)).toContainText('Не отмечен')
    await expect(visitCard(page, next.name)).toHaveAttribute('data-tone', 'plain')

    // A capsule opens its visit, the same as its card.
    await upNext.click()
    await expect(page.getByRole('dialog').filter({ hasText: next.name })).toBeVisible()
  })

  test('«Сейчас ←» appears when the day is scrolled away from now and brings it back', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    await fixClock(page)
    await page.goto(`/manage/${business.slug}?tab=schedule`)
    // The timeline is wide (an hour is 240px): the evening is far from 14:10.
    await page.getByRole('group', { name: 'Вид расписания' }).getByTitle('Лента').click()
    await expect(board(page).locator('[data-layout="timeline"]').first()).toBeVisible()

    const toNow = board(page).getByRole('button', { name: `Сейчас ${NOW}` })
    await expect(toNow).toHaveCount(0)
    // The day's own scroller: the nearest box around the grid that scrolls sideways.
    await board(page)
      .locator('div[data-layout="timeline"]')
      .first()
      .evaluate((grid) => {
        let node = grid.parentElement
        while (node && node.scrollWidth <= node.clientWidth) node = node.parentElement
        if (!node) throw new Error('No sideways scroller around the timeline')
        node.scrollLeft = node.scrollWidth
      })
    await expect(toNow).toHaveAttribute('data-side', 'before')

    await toNow.click()
    await expect(toNow).toHaveCount(0)
  })

  test('«Найти место под услугу» lights the gaps it fits in and books one with that master', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    // Tomorrow: no «now» on the day, the gaps run from opening. Visits 10:00–11:00 and
    // 11:30–12:30 leave half an hour between them, too short for the hour-long service.
    const first = await book(business, 'E2E Первый')
    const second = await placeAt(await book(business, 'E2E Второй'), first.date, '11:30')
    expect(first.time).toBe('10:00')

    await page.goto(`/manage/${business.slug}?tab=schedule&date=${second.date}`)
    await page.getByRole('button', { name: 'Найти место под услугу' }).click()
    await page.getByRole('menuitem', { name: new RegExp(business.service.name) }).click()

    await expect(page.getByText(`Места для «${business.service.name}» · 1 ч`)).toBeVisible()
    const gaps = board(page).getByRole('button', {
      name: new RegExp(`записать к мастеру ${business.master.name}`),
    })
    await expect(gaps).toHaveCount(1)
    await expect(gaps).toContainText('12:30–20:00')

    await gaps.click()
    const dialog = page.getByRole('dialog', { name: 'Новая запись' })
    await expect(dialog.getByRole('combobox', { name: 'Мастер' })).toContainText(
      business.master.name,
    )
    await expect(dialog.getByRole('combobox', { name: 'Время' })).toContainText('12:30')
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(dialog).toHaveCount(0)

    await page.getByRole('button', { name: 'Готово' }).click()
    await expect(gaps).toHaveCount(0)
    await expect(page.getByText(`Места для «${business.service.name}»`)).toHaveCount(0)
  })
})
