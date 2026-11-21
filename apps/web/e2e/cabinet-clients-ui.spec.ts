import { expect, type Page, test } from '@playwright/test'
import { formatPhone, randomClientPhone } from './account'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

const SERVICES = [
  { name: 'Стрижка', durationMinutes: 60, price: 1000 },
  { name: 'Борода', durationMinutes: 30, price: 600 },
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
      data: { name: master.name, role: 'Мастер', serviceIds: [service.id] },
    })
    expect(saved.ok()).toBe(true)
  }
  return { azamat, bekzat, haircut, beard }
}

const openClientFromClients = async (page: Page, business: OwnBusiness, name: string) => {
  await page.goto(`/manage/${business.slug}?tab=clients`)
  await page.getByRole('button', { name: new RegExp(name) }).click()
  return page.getByRole('dialog', { name: 'Клиент', exact: true })
}

test.describe('Client card: what it leads to', () => {
  test('from the schedule «Записать снова» prefills the usual service, its master and the client; the history folds past four', async ({
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
    await page.getByRole('button', { name: new RegExp(`^${name}\\s*: карточка клиента$`) }).click()

    const card = page.getByRole('dialog', { name: 'Клиент', exact: true })
    await expect(card).toContainText('Обычно: Борода')
    const history = card.getByRole('region', { name: 'История' })
    await expect(history.getByRole('listitem')).toHaveCount(4)
    await history.getByRole('button', { name: 'Ещё 1 визит' }).click()
    await expect(history.getByRole('listitem')).toHaveCount(5)
    // Newest first: the haircut ahead, then the paid beard with its money and how it was paid.
    await expect(history.getByRole('listitem').first()).toContainText('Стрижка')
    await expect(history.getByRole('listitem').nth(1)).toContainText('Борода')
    await expect(history.getByRole('listitem').nth(1)).toContainText(/1\s500\s*сом, карта/)
    await expect(history.getByRole('listitem').last()).toContainText(`${azamat.name}`)

    await card.getByRole('button', { name: 'Записать снова' }).click()
    const booking = page.getByRole('dialog', { name: 'Новая запись', exact: true })
    await expect(booking.getByRole('combobox', { name: 'Мастер' })).toContainText(bekzat.name)
    await expect(booking.getByRole('combobox', { name: 'Услуга' })).toContainText('Борода')
    await expect(booking.getByPlaceholder('Как зовут')).toHaveValue(name)
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
    const loyalty = card.getByRole('region', { name: 'Лояльность' })
    await loyalty.getByRole('combobox', { name: 'Продать абонемент' }).click()
    await page.getByRole('option', { name: /^E2E Пять стрижек · 4\s000\s*сом$/ }).click()
    await expect(page.getByText('Абонемент оформлен')).toBeVisible()
    await expect(loyalty).toContainText(/E2E Пять стрижек\s*5 визитов · до/)

    const bought = await (
      await page.request.get(
        `/api/manage/${business.slug}/loyalty/clients/${encodeURIComponent(phone)}`,
      )
    ).json()
    expect(bought.subscriptions).toEqual([
      expect.objectContaining({ title: 'E2E Пять стрижек', visitsLeft: 5 }),
    ])
  })

  test('«Позвать» under «Давно не были» opens the mailing on that group', async ({ page }) => {
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
      .getByRole('tablist', { name: 'Группы клиентов' })
      .getByRole('tab', { name: /^Давно не были/ })
      .click()
    await page.getByRole('button', { name: 'Позвать 1 клиента' }).click()

    const mailing = page.getByRole('dialog', { name: 'Рассылка', exact: true })
    await expect(mailing.getByRole('radio', { name: 'Давно не были' })).toBeChecked()
    await expect(mailing.getByRole('region', { name: 'Кому' })).toContainText('1 клиент')
    await expect(mailing.getByRole('region', { name: 'Кому' })).toContainText('E2E')
    await expect(mailing.getByRole('region', { name: 'Кому' })).not.toContainText('и другие')
  })
})
