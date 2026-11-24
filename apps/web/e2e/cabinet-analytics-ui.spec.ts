import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Monday is 0, like the API's weekdays.
const weekdayOf = (dayKey: string) => (new Date(`${dayKey}T00:00:00Z`).getUTCDay() + 6) % 7

// Two past visits a week apart, both at 10:00 on the same weekday: that hour is the peak and every
// other hour of the week is quiet.
const twoVisitsOnOneHour = async (business: OwnBusiness) => {
  const visit = (daysBack: number, fromDay: number) =>
    createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      daysBack,
      fromDay,
    })
  const older = await visit(9, 1)
  const newer = await visit(2, 2)
  expect([older.time, newer.time]).toEqual(['10:00', '10:00'])
  return { older, newer }
}

const openAnalytics = async (page: Page, business: OwnBusiness) => {
  await page.goto(`/manage/${business.slug}?tab=analytics`)
  await expect(page.getByRole('region', { name: 'Revenue' })).toContainText('2,000')
}

test.describe('Cabinet analytics: the charts lead somewhere', () => {
  test('a revenue column opens that day in the schedule', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const { older } = await twoVisitsOnOneHour(business)
    await openAnalytics(page, business)

    // Only the two days with money have a column of this period; the older one comes first.
    const columns = page
      .getByRole('region', { name: 'Revenue' })
      .locator('.recharts-bar-rectangle path[fill="var(--color-primary)"]')
    await expect(columns).toHaveCount(2)
    await columns.first().click()
    await expect(page).toHaveURL(new RegExp(`[?&]tab=schedule&date=${older.date}$`))
    await expect(
      page.getByRole('group', { name: 'Day' }).locator(`[data-day="${older.date}"]`),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('the heatmap reads an hour out; a quiet one becomes a happy-hours promotion', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    const { newer } = await twoVisitsOnOneHour(business)
    const peakDay = weekdayOf(newer.date)
    const quietDay = (peakDay + 1) % 7
    await openAnalytics(page, business)

    const heatmap = page.getByRole('region', { name: 'Load by hour' })
    await expect(heatmap).toContainText(`Peak: ${WEEKDAYS[peakDay]}, 10:00–11:00 · 2 visits`)

    // The keyboard walks the grid from the peak and the line above follows.
    const peak = heatmap.getByRole('button', {
      name: `${WEEKDAYS[peakDay]}, 10:00–11:00: 2 visits`,
    })
    await peak.focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      heatmap.getByRole('button', { name: `${WEEKDAYS[peakDay]}, 11:00–12:00: 0 visits` }),
    ).toBeFocused()
    await expect(heatmap).toContainText(
      `${WEEKDAYS[peakDay]}, 11:00–12:00 · 0 visits · peak ${WEEKDAYS[peakDay]} 10:00, 2 visits`,
    )

    // The peak itself is no quiet hour: no promotion is offered for it.
    await peak.click()
    await expect(heatmap.getByRole('button', { name: /^Discount on/ })).toHaveCount(0)

    await heatmap
      .getByRole('button', { name: `${WEEKDAYS[quietDay]}, 15:00–16:00: 0 visits` })
      .click()
    await heatmap
      .getByRole('button', {
        name: `Discount on ${WEEKDAYS[quietDay]} 15:00–16:00 to fill the hour`,
      })
      .click()

    const sheet = page.getByRole('dialog', { name: 'New promotion', exact: true })
    await expect(sheet.getByLabel('Promotion name')).toHaveValue(`${WEEKDAY_NAMES[quietDay]} 15:00`)
    const days = sheet.getByRole('group', { name: 'Days of the week' })
    await expect(days.getByRole('button', { pressed: true })).toHaveText([WEEKDAYS[quietDay] ?? ''])
    await expect(sheet.getByRole('combobox', { name: 'Start' })).toContainText('15:00')
    await expect(sheet.getByRole('combobox', { name: 'End' })).toContainText('16:00')

    await sheet.getByLabel('Promotion name').fill('E2E Тихий час')
    await sheet.getByLabel('Discount, %').fill('15')
    await sheet.getByRole('button', { name: 'Save' }).click()
    await expect(sheet).toHaveCount(0)
    const promotions = await (
      await page.request.get(`/api/manage/${business.slug}/promotions`)
    ).json()
    expect(promotions).toContainEqual(
      expect.objectContaining({
        title: 'E2E Тихий час',
        kind: 'happy_hours',
        percent: 15,
        weekdays: [quietDay],
        fromMinutes: 15 * 60,
        toMinutes: 16 * 60,
      }),
    )
  })
})
