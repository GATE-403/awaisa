import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'
import { bookingSteps, pickFirstFreeSlot } from './helpers'
import { bookAhead } from './visits'

const SLUG = 'awaisa-studio'
const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000'

// The link the confirmation SMS carries.
const visitPath = (id: string) =>
  `/v/${id}?s=${createHmac('sha256', process.env.AUTH_SECRET || DEV_AUTH_SECRET)
    .update(`visit:${id}`)
    .digest('base64url')
    .slice(0, 22)}`

test.describe('Client flow from outside the site', () => {
  test('the SMS link keeps the visit on the phone and lets the client cancel it', async ({
    page,
  }) => {
    const booking = await bookAhead({ specialistIndex: 2, name: 'E2E Ссылка' })
    await page.goto(visitPath(booking.id))
    await expect(page).toHaveURL(/\/bookings$/)
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await expect(ticket).toContainText(booking.serviceName)

    // Under load the menu opened right after the redirect can be closed by the page settling
    // around it (seen as «not stable», then «detached»); a person taps «Ещё» again, so does the test.
    await expect(async () => {
      await ticket.getByRole('button', { name: 'Ещё' }).click()
      await page.getByRole('menuitem', { name: 'Отменить запись' }).click({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await expect(ticket.getByText('Отменена')).toBeVisible()
  })

  test('a link with a wrong signature opens nothing', async ({ page }) => {
    const booking = await bookAhead({ specialistIndex: 2, name: 'E2E Ссылка' })
    await page.goto(`/v/${booking.id}?s=${'x'.repeat(22)}`)
    await expect(page.getByRole('heading', { name: /Ссылка не открылась/ })).toBeVisible()
  })

  test('a returning guest finds their name and number already filled in', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'awaisa:contact:v1',
        JSON.stringify({ name: 'E2E Постоянный', phone: '+996 555 000 111' }),
      )
    })
    await page.goto(`/${SLUG}/book`)
    // Contacts come last, after the choices.
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio').first().click()
    await page.locator('#step-specialist [type="radio"], #step-datetime').first().waitFor()
    const anyMaster = steps.specialist.getByRole('radio', { name: /Любой мастер/ })
    if (await anyMaster.isVisible()) await anyMaster.click()
    await pickFirstFreeSlot(page)
    await expect(page.locator('#step-contacts').getByLabel('Имя')).toHaveValue('E2E Постоянный')
    await expect(page.locator('#step-contacts').getByLabel('Телефон')).toHaveValue(
      '+996 555 000 111',
    )
  })

  test('each branch has its own booking link for 2ГИС', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto(`/manage/${SLUG}?tab=branches`)
    const links = page.getByRole('heading', { name: 'Ссылки для записи' })
    await expect(links).toBeVisible()
    await expect(page.getByText(new RegExp(`/${SLUG}/book`)).first()).toBeVisible()
  })
})
