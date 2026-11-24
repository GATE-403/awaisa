import { expect, type Page, test } from '@playwright/test'
import { formatPhone, randomClientPhone } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

const SERVICES = [
  { name: 'Haircut', durationMinutes: 60, price: 1000 },
  { name: 'Beard', durationMinutes: 30, price: 600 },
]

// The masters split the menu: Азамат only cuts hair, Бекзат only does beards.
const splitMenu = async (page: Page, business: OwnBusiness) => {
  const [azamat, bekzat] = business.masters
  const [haircut, beard] = business.services
  if (!azamat || !bekzat || !haircut || !beard) throw new Error('Two masters and two services')
  for (const [master, service] of [
    [azamat, haircut],
    [bekzat, beard],
  ] as const) {
    const saved = await page.request.put(`/api/manage/${business.slug}/specialists/${master.id}`, {
      data: { name: master.name, role: 'Specialist', serviceIds: [service.id] },
    })
    expect(saved.ok()).toBe(true)
  }
  return { azamat, bekzat, haircut, beard }
}

const openClientFromClients = async (page: Page, business: OwnBusiness, name: string) => {
  await page.goto(`/manage/${business.slug}?tab=clients`)
  await page.getByRole('button', { name: new RegExp(name) }).click()
  return page.getByRole('dialog', { name: 'Client', exact: true })
}

test.describe('Client card: what it leads to', () => {
  test('from the schedule “Book again” prefills the usual service, its master and the client; the history folds past four', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, {
      services: SERVICES,
      masters: ['Азамат', 'Бекзат'],
    })
    const { azamat, bekzat, haircut, beard } = await splitMenu(page, business)
    const name = 'E2E Постоянный'
    const phone = randomClientPhone()
    const visit = (serviceId: string, specialistId: string, daysBack?: number, fromDay = 1) =>
      createVisit({ slug: business.slug, serviceId, specialistId, name, phone, daysBack, fromDay })
    // Three beards and one haircut behind him: the beard is what he usually comes for.
    const paid = await visit(beard.id, bekzat.id, 3)
    await visit(beard.id, bekzat.id, 5)
    await visit(beard.id, bekzat.id, 7)
    await visit(haircut.id, azamat.id, 9)
    const ahead = await visit(haircut.id, azamat.id, undefined, 2)
    expect(
      (
        await page.request.patch(`/api/manage/${business.slug}/bookings/${paid.id}/outcome`, {
          data: { outcome: 'arrived', paidAmount: 1500, paymentMethod: 'card' },
        })
      ).ok(),
    ).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=schedule&date=${ahead.date}`)
    await page
      .locator('[data-schedule-board]')
      .getByRole('button', { name: new RegExp(`, ${name}, `) })
      .click()
    await page.getByRole('button', { name: new RegExp(`^${name}\\s*: client card$`) }).click()

    const card = page.getByRole('dialog', { name: 'Client', exact: true })
    await expect(card).toContainText('Usually: Beard')
    const history = card.getByRole('region', { name: 'History' })
    await expect(history.getByRole('listitem')).toHaveCount(4)
    await history.getByRole('button', { name: '1 more visit' }).click()
    await expect(history.getByRole('listitem')).toHaveCount(5)
    // Newest first: the haircut ahead, then the paid beard with its money and how it was paid.
    await expect(history.getByRole('listitem').first()).toContainText('Haircut')
    await expect(history.getByRole('listitem').nth(1)).toContainText('Beard')
    await expect(history.getByRole('listitem').nth(1)).toContainText(/1,500\s*som, card/)
    await expect(history.getByRole('listitem').last()).toContainText(`${azamat.name}`)

    await card.getByRole('button', { name: 'Book again' }).click()
    const booking = page.getByRole('dialog', { name: 'New booking', exact: true })
    await expect(booking.getByRole('combobox', { name: 'Specialist' })).toContainText(bekzat.name)
    await expect(booking.getByRole('combobox', { name: 'Service' })).toContainText('Beard')
    await expect(booking.getByPlaceholder('Name')).toHaveValue(name)
    await expect(booking.getByPlaceholder('+996 555 123 456')).toHaveValue(formatPhone(phone))
  })

  test('a subscription is sold from the card and its visits show at once', async ({ page }) => {
    const business = await createOwnBusiness(page)
    const phone = randomClientPhone()
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Абонементщик',
      phone,
      daysBack: 2,
    })
    const plan = await page.request.post(`/api/manage/${business.slug}/loyalty/plans`, {
      data: { title: 'E2E Пять стрижек', visits: 5, price: 4000, validDays: 60 },
    })
    expect(plan.ok()).toBe(true)

    const card = await openClientFromClients(page, business, 'E2E Абонементщик')
    const loyalty = card.getByRole('region', { name: 'Loyalty' })
    await loyalty.getByRole('combobox', { name: 'Sell a subscription' }).click()
    await page.getByRole('option', { name: /^E2E Пять стрижек · 4,000\s*som$/ }).click()
    await expect(page.getByText('Subscription sold')).toBeVisible()
    await expect(loyalty).toContainText(/E2E Пять стрижек\s*5 visits · until/)

    const bought = await (
      await page.request.get(
        `/api/manage/${business.slug}/loyalty/clients/${encodeURIComponent(phone)}`,
      )
    ).json()
    expect(bought.subscriptions).toEqual([
      expect.objectContaining({ title: 'E2E Пять стрижек', visitsLeft: 5 }),
    ])
  })

  test('“Invite” under “Lapsed” opens the mailing on that group', async ({ page }) => {
    const business = await createOwnBusiness(page)
    // Three months ago, SMS left on: lapsed and reachable.
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Пропавший',
      daysBack: 90,
      smsConfirmation: true,
    })
    // A recent client is not in the group.
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Недавний',
      daysBack: 3,
      smsConfirmation: true,
    })

    await page.goto(`/manage/${business.slug}?tab=clients`)
    await page
      .getByRole('tablist', { name: 'Client groups' })
      .getByRole('tab', { name: /^Lapsed/ })
      .click()
    await page.getByRole('button', { name: 'Invite 1 client' }).click()

    const mailing = page.getByRole('dialog', { name: 'Mailing', exact: true })
    await expect(mailing.getByRole('radio', { name: 'Lapsed' })).toBeChecked()
    await expect(mailing.getByRole('region', { name: 'To' })).toContainText('1 client')
    await expect(mailing.getByRole('region', { name: 'To' })).toContainText('E2E')
    await expect(mailing.getByRole('region', { name: 'To' })).not.toContainText('and others')
  })
})
