import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'
import { API_URL } from './helpers'

const SLUG = 'awaisa-studio'

type Slot = { time: string; isAvailable: boolean }

const weekdayOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7

test.describe('Master schedules', () => {
  test('own hours, a day off and a leave narrow what clients can book', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    // The last master, so the booking-flow tests' masters stay untouched.
    const master = business.catalog.specialists.at(-1)
    const serviceId = master.serviceIds[0]
    const manage = `/api/manage/${SLUG}/specialists/${master.id}`

    const slotsOn = async (date: string) => {
      const response = await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${master.id}&date=${date}`,
      )
      return ((await response.json()).slots as Slot[]).filter((slot) => slot.isAvailable)
    }

    // A day a week ahead the business is open: far from «now», so lead time doesn't matter.
    let date = ''
    for (let offset = 7; offset < 14 && !date; offset += 1) {
      const candidate = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
      if ((await slotsOn(candidate)).length > 0) date = candidate
    }
    expect(date).not.toBe('')
    const weekday = weekdayOf(date)

    try {
      await page.request.put(`${manage}/hours`, {
        data: {
          hasOwnHours: true,
          days: [{ weekday, opensMinutes: 14 * 60, closesMinutes: 17 * 60 }],
        },
      })
      const own = await slotsOn(date)
      expect(own.length).toBeGreaterThan(0)
      expect(own.every((slot) => slot.time >= '14:00' && slot.time < '17:00')).toBe(true)

      // Own week without that weekday: a day off.
      await page.request.put(`${manage}/hours`, {
        data: {
          hasOwnHours: true,
          days: [{ weekday: (weekday + 1) % 7, opensMinutes: 600, closesMinutes: 1200 }],
        },
      })
      expect(await slotsOn(date)).toHaveLength(0)

      // Back to the business hours, then a leave on that day.
      await page.request.put(`${manage}/hours`, { data: { hasOwnHours: false, days: [] } })
      expect((await slotsOn(date)).length).toBeGreaterThan(0)
      const added = await page.request.post(`${manage}/leaves`, {
        data: { startsOn: date, endsOn: date, reason: 'E2E отпуск' },
      })
      const { leave } = await added.json()
      expect(await slotsOn(date)).toHaveLength(0)
      const schedule = await (
        await page.request.get(`/api/manage/${SLUG}/schedule?date=${date}`)
      ).json()
      expect(
        schedule.specialists.find((item: { id: string }) => item.id === master.id),
      ).toMatchObject({
        isOnLeave: true,
        leaveReason: 'E2E отпуск',
        hours: null,
      })
      await page.request.delete(`${manage}/leaves/${leave.id}`)
      expect((await slotsOn(date)).length).toBeGreaterThan(0)

      // The cabinet sheet: switch off «Как у салона» and save.
      await page.goto(`/manage/${SLUG}?tab=masters`)
      await page
        .getByRole('button', { name: new RegExp(master.name) })
        .first()
        .click()
      await page.getByRole('button', { name: 'График и отпуск' }).click()
      const sheet = page.getByRole('dialog', { name: master.name })
      await sheet.getByRole('switch').first().click()
      await expect(sheet.getByText('Понедельник')).toBeVisible()
      await sheet.getByRole('button', { name: 'Сохранить' }).click()
      await expect(page.getByText(`График ${master.name} сохранён`)).toBeVisible()
      expect((await (await page.request.get(`${manage}/schedule`)).json()).hasOwnHours).toBe(true)
    } finally {
      await page.request.put(`${manage}/hours`, { data: { hasOwnHours: false, days: [] } })
    }
  })
})
