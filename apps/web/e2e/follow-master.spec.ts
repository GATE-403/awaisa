import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'
import { withDb } from './visits'

// Clients follow their master: the bell on the place page, «Мои мастера» in the profile, and one
// message when time with the master frees up.
test.describe('Following a master', () => {
  test('a client follows from the place page and lets go in the profile', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Runs once: it changes the account')
    await signInViaApi(page, randomClientPhone(), 'E2E Подписчик')
    await page.goto('/lumiere-salon#masters')
    const masters = page.locator('#masters')
    const bell = masters.getByRole('button', { name: /^Следить за мастером/ }).first()
    const label = (await bell.getAttribute('aria-label')) ?? ''
    const name = label.replace('Следить за мастером ', '')
    await bell.click()
    await expect(page.getByText(`Вы следите за мастером ${name}`)).toBeVisible()
    await expect(
      masters.getByRole('button', { name: `Не следить за мастером ${name}` }),
    ).toHaveAttribute('aria-pressed', 'true')
    const follows = await (await page.request.get('/api/me/follows')).json()
    expect(follows).toHaveLength(1)

    await page.goto('/bookings?tab=settings')
    await expect(page.getByText('Мои мастера')).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Новые работы' })).not.toBeChecked()
    await page.getByRole('button', { name: new RegExp(`^Не следить ${follows[0].name}`) }).click()
    await expect(page.getByText('Мои мастера')).toHaveCount(0)
    expect(await (await page.request.get('/api/me/follows')).json()).toEqual([])
  })

  test('a cancellation tells the master’s followers once; the master sees how many follow', async ({
    page,
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'Runs once: it waits for the minute job')
    test.setTimeout(150_000)
    const business = await createOwnBusiness(page)
    const master = business.masters[0]
    if (!master) throw new Error('A master expected')
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${master.id}`, {
          data: {
            name: master.name,
            role: 'Мастер',
            serviceIds: master.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)

    const fanContext = await browser.newContext()
    const fan = await fanContext.newPage()
    const fanPhone = randomClientPhone()
    try {
      await signInViaApi(fan, fanPhone, 'E2E Поклонник')
      expect((await fan.request.put(`/api/me/follows/${master.id}`, { data: {} })).ok()).toBe(true)
    } finally {
      await fanContext.close()
    }

    // Someone else's visit tomorrow is cancelled: the time is free again.
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: master.id,
    })
    const cancelled = await page.request.delete(`/api/bookings/${visit.id}`, {
      headers: { 'x-booking-token': visit.token },
    })
    expect(cancelled.ok()).toBe(true)

    const notifiedAt = () =>
      withDb(async (client) => {
        const { rows } = await client.query(
          `SELECT f."last_notified_at" FROM "master_follows" f
           JOIN "customers" c ON c."id" = f."customer_id" WHERE c."phone" = $1`,
          [fanPhone],
        )
        return rows[0]?.last_notified_at ?? null
      })
    await expect.poll(notifiedAt, { timeout: 120_000, intervals: [5_000] }).not.toBeNull()
    const notices = await withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT COUNT(*)::int AS "count" FROM "master_follow_notices" WHERE "specialist_id" = $1',
        [master.id],
      )
      return rows[0]?.count
    })
    expect(notices).toBe(1)

    const masterContext = await browser.newContext()
    const masterPage = await masterContext.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Мастер')
      const day = await (
        await masterPage.request.get(`/api/master/${business.slug}/day?date=${visit.date}`)
      ).json()
      expect(day.followers).toBe(1)
    } finally {
      await masterContext.close()
    }
  })
})
