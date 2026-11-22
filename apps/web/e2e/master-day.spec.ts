import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'
import { API_URL } from './helpers'

test.describe('«Мой день» for a master', () => {
  test('a master marks their own visit «Пришёл», reads their reviews and never sees a colleague’s', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, { masters: ['Азамат', 'Бекзат'] })
    const [azamat, bekzat] = business.masters
    if (!azamat || !bekzat) throw new Error('Two masters expected')
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${azamat.id}`, {
          data: {
            name: azamat.name,
            role: 'Мастер',
            serviceIds: azamat.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)
    const visit = (specialistId: string, name: string) =>
      createVisit({
        slug: business.slug,
        serviceId: business.service.id,
        specialistId,
        name,
        daysBack: 1,
      })
    const own = await visit(azamat.id, 'E2E Клиент Азамата')
    const reviewed = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: azamat.id,
      name: 'E2E Довольный',
      daysBack: 5,
    })
    const colleague = await visit(bekzat.id, 'E2E Клиент Бекзата')
    const rated = await fetch(`${API_URL}/bookings/${reviewed.id}/review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-booking-token': reviewed.token },
      body: JSON.stringify({ rating: 5, comment: 'E2E Лучший барбер' }),
    })
    expect(rated.ok).toBe(true)

    const masterContext = await browser.newContext()
    const master = await masterContext.newPage()
    try {
      await signInViaApi(master, masterPhone, 'E2E Мастер')
      const places = await (await master.request.get('/api/me/master')).json()
      expect(places).toContainEqual(
        expect.objectContaining({ slug: business.slug, specialistId: azamat.id }),
      )
      // One place: «/master» opens its day straight away.
      await master.goto('/master')
      await expect(master).toHaveURL(new RegExp(`/master/${business.slug}$`))
      await expect(master.getByRole('heading', { name: /Мой день/ })).toBeVisible()
      await expect(master.getByText(`Азамат · ${business.name}`)).toBeVisible()

      await master.locator(`[data-day="${own.date}"]`).click()
      await expect(master.locator(`[data-day="${own.date}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      const agenda = master.getByRole('listitem').filter({ hasText: 'E2E Клиент Азамата' })
      await expect(agenda).toContainText(own.time)
      await expect(agenda).toContainText('Стрижка')
      // The colleague's visit on the same day is not here.
      await expect(master.getByText('E2E Клиент Бекзата')).toHaveCount(0)

      const outcome = agenda.getByRole('group', { name: `Итог визита ${own.time}` })
      await expect(outcome.getByRole('radio', { name: 'Ждём', exact: true })).toBeChecked()
      await outcome.getByText('Пришёл', { exact: true }).click()
      await expect(outcome.getByRole('radio', { name: 'Пришёл', exact: true })).toBeChecked()
      // Saved, not only drawn: the owner's schedule reads it back.
      await expect
        .poll(async () => {
          const day = await (
            await page.request.get(`/api/manage/${business.slug}/schedule?date=${own.date}`)
          ).json()
          return day.bookings.find((booking: { id: string }) => booking.id === own.id)?.outcome
        })
        .toBe('arrived')

      // A colleague's visit cannot be closed through the API either.
      const foreign = await master.request.patch(
        `/api/master/${business.slug}/bookings/${colleague.id}/outcome`,
        { data: { outcome: 'no_show' } },
      )
      expect(foreign.status()).toBe(403)

      const reviews = master.getByRole('region', { name: 'Ваши отзывы' })
      await expect(reviews).toContainText('E2E Лучший барбер')
      await expect(reviews).toContainText('5,0 · 1 отзыв')
    } finally {
      await masterContext.close()
    }
  })

  test('a number that is not a master here gets «Нет доступа»', async ({ page, browser }) => {
    const business = await createOwnBusiness(page)
    const strangerContext = await browser.newContext()
    const stranger = await strangerContext.newPage()
    try {
      await signInViaApi(stranger, randomClientPhone(), 'E2E Чужой')
      await stranger.goto(`/master/${business.slug}`)
      await expect(stranger.getByRole('heading', { name: /Нет доступа/ })).toBeVisible()
      expect((await stranger.request.get(`/api/master/${business.slug}/reviews`)).status()).toBe(
        403,
      )
      expect(
        (await stranger.request.get(`/api/master/${business.slug}/day?date=2026-01-01`)).status(),
      ).toBe(403)
    } finally {
      await strangerContext.close()
    }
  })
})
