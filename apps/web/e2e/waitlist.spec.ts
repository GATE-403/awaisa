import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { API_URL } from './helpers'

const SLUG = 'awaisa-studio'

type Slot = { time: string; isAvailable: boolean }
type StoredEntry = { id: string; token: string }

test.describe('Waitlist', () => {
  test('a guest waits for a full day and is told when a time opens up', async ({
    page,
    browser,
    isMobile,
  }, testInfo) => {
    // One master's day is made full; running it once keeps the two projects from colliding.
    test.skip(isMobile, 'Runs once: it changes a master’s days')
    test.setTimeout(150_000)
    // Its own name: a repeated run finds earlier guests waiting for the same day.
    const guestName = `E2E Ожидание ${randomClientPhone().slice(-4)}`
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists.at(-1)
    const serviceId = master.serviceIds[0]
    const leaves = `/api/manage/${SLUG}/specialists/${master.id}/leaves`
    const slotsOn = async (date: string) => {
      const response = await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${master.id}&date=${date}`,
      )
      return ((await response.json()).slots as Slot[]).filter((slot) => slot.isAvailable)
    }

    let date = ''
    for (let offset = 8; offset < 14 && !date; offset += 1) {
      const candidate = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
      if ((await slotsOn(candidate)).length > 0) date = candidate
    }
    expect(date).not.toBe('')

    // A free day needs no waitlist: the API sends the client to book it instead.
    const refused = await fetch(`${API_URL}/waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: master.id,
        date,
        name: 'E2E Ожидание',
        phone: randomClientPhone(),
      }),
    })
    expect(refused.status).toBe(409)

    const added = await page.request.post(leaves, {
      data: { startsOn: date, endsOn: date, reason: 'E2E лист ожидания' },
    })
    const { leave } = await added.json()
    const guest = await browser.newContext()
    const guestPage = await guest.newPage()

    try {
      expect(await slotsOn(date)).toHaveLength(0)

      await guestPage.goto(
        `/${SLUG}/book?service=${serviceId}&specialist=${master.id}&date=${date}`,
      )
      await guestPage.getByRole('button', { name: 'Tell me when a slot opens' }).click()
      const sheet = guestPage.getByRole('dialog', { name: 'Waitlist' })
      await sheet.getByLabel('Name').fill(guestName)
      await sheet.getByLabel('Phone').fill(randomClientPhone().replace('+996', ''))
      await sheet.getByRole('button', { name: 'Done' }).click()
      await expect(guestPage.getByText('We will tell you if a slot opens up')).toBeVisible()
      await expect(guestPage.getByText('Waiting for a slot on this day')).toBeVisible()

      const [entry] = await guestPage.evaluate(
        () => JSON.parse(localStorage.getItem('awaisa:waitlist:v1') ?? '[]') as StoredEntry[],
      )
      expect(entry).toBeDefined()
      const read = async () =>
        (
          await fetch(`${API_URL}/waitlist/${entry?.id}`, {
            headers: { 'x-waitlist-token': entry?.token ?? '' },
          })
        ).json()
      expect((await read()).status).toBe('waiting')

      // The owner sees who waits for that day and can book them in from the cabinet.
      await page.goto(`/manage/${SLUG}?tab=schedule&date=${date}`)
      await page.getByRole('button', { name: /^Waiting for a slot: \d+/ }).click()
      const waiting = page.getByRole('dialog', { name: 'Waiting for a slot' })
      const waiter = waiting.getByRole('listitem').filter({ hasText: guestName })
      await expect(waiter).toBeVisible()
      await waiter.getByRole('button', { name: 'Book' }).click()
      await expect(
        page
          .getByRole('dialog', { name: 'New booking' })
          .and(page.locator(':not([data-type])'))
          .getByLabel('Name'),
      ).toHaveValue(guestName)
      await page.keyboard.press('Escape')

      // The salon frees the day: the minute cron texts the client and marks the entry.
      await page.request.delete(`${leaves}/${leave.id}`)
      await expect
        .poll(async () => (await read()).status, { timeout: 100_000, intervals: [5_000] })
        .toBe('notified')
      expect((await read()).notifiedTime).toMatch(/^\d{2}:\d{2}$/)

      // The profile shows it with a link straight to that time; the client can drop it.
      await guestPage.goto('/bookings')
      const row = guestPage.getByRole('listitem', { name: /^Waiting for a slot:/ })
      await expect(row.getByRole('link', { name: /^\d{2}:\d{2} is free/ })).toBeVisible()
      await row.getByRole('button', { name: 'Stop waiting' }).click()
      await expect(row).toHaveCount(0)
    } finally {
      await page.request.delete(`${leaves}/${leave.id}`).catch(() => undefined)
      await guest.close()
    }
  })
})
