import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

// An administrator runs the day but sees no money: the same screens, side by side with the
// owner's on the same data, must differ exactly in the sums, the mailing and import tools and the
// setup checklist.
const MONEY = /1\s000\sсом/

const scheduleHead = (page: Page) => page.getByRole('region', { name: 'Расписание' })

// The line under the day's title: «1 запись», and for the owner «· 1 000 сом» after it.
const dayStats = (page: Page) => scheduleHead(page).getByText(/^1 запись/)

const openClient = async (page: Page, business: OwnBusiness, name: string) => {
  await page.goto(`/manage/${business.slug}?tab=clients`)
  const row = page.getByRole('button', { name: new RegExp(name) })
  await expect(row).toBeVisible()
  return row
}

test.describe('Administrators see no money', () => {
  test('the day’s takings, client spend, mailing, import and the setup checklist are the owner’s', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    const ahead = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Завтрашний',
    })
    const past = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Постоянный',
      daysBack: 3,
    })
    await page.request.patch(`/api/manage/${business.slug}/bookings/${past.id}/outcome`, {
      data: { outcome: 'arrived', paidAmount: 1000, paymentMethod: 'cash' },
    })
    const staffPhone = randomClientPhone()
    const added = await page.request.post(`/api/manage/${business.slug}/members`, {
      data: { phone: staffPhone },
    })
    expect(added.ok()).toBe(true)

    const staffContext = await browser.newContext({ ...test.info().project.use })
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Админ Салона')

      // The day ahead: both see the visit and its price on the card (it is what the client
      // pays at the desk); only the owner sees the day's takings beside the count.
      for (const viewer of [page, staff]) {
        await viewer.goto(`/manage/${business.slug}?tab=schedule&date=${ahead.date}`)
        await expect(scheduleHead(viewer)).toContainText(`Стрижка · ${'1\u00a0000'}`)
      }
      await expect(dayStats(page)).toHaveText(/^1 запись · 1\s000\sсом$/)
      await expect(dayStats(staff)).toHaveText('1 запись')

      // The client base: the spend on the row and in the card.
      const ownerRow = await openClient(page, business, past.name)
      const staffRow = await openClient(staff, business, past.name)
      await expect(ownerRow).toContainText(MONEY)
      await expect(staffRow).toContainText('1 визит')
      await expect(staffRow).not.toContainText('сом')

      // The card's facts line: the total spend is the owner's (each visit's own payment in the
      // history stays, staff enter it themselves at the desk).
      await ownerRow.click()
      await expect(page.getByRole('dialog', { name: 'Клиент' }).getByText(/^1 визит ·/)).toHaveText(
        /^1 визит · 1\s000\sсом · с /,
      )
      await staffRow.click()
      const staffFacts = staff.getByRole('dialog', { name: 'Клиент' }).getByText(/^1 визит ·/)
      await expect(staffFacts).toHaveText(/^1 визит · с /)
      await staff.keyboard.press('Escape')
      await page.keyboard.press('Escape')

      // Calling clients back and loading a base are the owner's tools.
      for (const tool of ['Импорт', 'Рассылка']) {
        await expect(page.getByRole('button', { name: tool, exact: true })).toHaveCount(1)
        await expect(staff.getByRole('button', { name: tool, exact: true })).toHaveCount(0)
      }

      // Setting the business up is the owner's too: with no working master the checklist
      // appears for the owner and never for the administrator.
      const master = business.master
      const deactivated = await page.request.put(
        `/api/manage/${business.slug}/specialists/${master.id}`,
        {
          data: {
            name: master.name,
            role: 'Мастер',
            serviceIds: master.serviceIds,
            isActive: false,
          },
        },
      )
      expect(deactivated.ok()).toBe(true)
      await page.goto(`/manage/${business.slug}`)
      await staff.goto(`/manage/${business.slug}`)
      await expect(page.getByRole('heading', { name: 'Запуск записи' })).toBeVisible()
      await expect(scheduleHead(staff)).toBeVisible()
      await expect(staff.getByRole('heading', { name: 'Запуск записи' })).toHaveCount(0)
    } finally {
      await staffContext.close()
    }
  })
})
