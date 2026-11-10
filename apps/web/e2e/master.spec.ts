import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'

type ManagedSpecialist = {
  id: string
  name: string
  role: string
  serviceIds: string[]
  isActive: boolean
  branchId: string | null
  phone: string
}

test.describe('Master cabinet', () => {
  test('a master signs in with their number and sees and closes only their own visits', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get(`/api/manage/${SLUG}`)).json()
    const master: ManagedSpecialist = managed.catalog.specialists[0]
    const masterPhone = randomClientPhone()
    const saveMaster = (phone: string) =>
      page.request.put(`/api/manage/${SLUG}/specialists/${master.id}`, {
        data: {
          name: master.name,
          role: master.role,
          serviceIds: master.serviceIds,
          isActive: master.isActive,
          branchId: master.branchId,
          phone,
        },
      })
    expect((await saveMaster(masterPhone)).ok()).toBe(true)

    const masterContext = await browser.newContext()
    const masterPage = await masterContext.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Мастер')
      const places = await (await masterPage.request.get('/api/me/master')).json()
      expect(places).toContainEqual(
        expect.objectContaining({ slug: SLUG, specialistId: master.id }),
      )

      const own = await createPastVisit('E2E Клиент мастера', randomClientPhone(), 0)
      const other = await createPastVisit('E2E Клиент другого', randomClientPhone(), 1)
      const date = own.date

      const day = await (
        await masterPage.request.get(`/api/master/${SLUG}/day?date=${date}`)
      ).json()
      expect(day.master.id).toBe(master.id)
      expect(day.bookings.some((booking: { id: string }) => booking.id === own.booking.id)).toBe(
        true,
      )
      expect(
        day.bookings.every(
          (booking: { specialistId: string }) => booking.specialistId === master.id,
        ),
      ).toBe(true)

      const marked = await masterPage.request.patch(
        `/api/master/${SLUG}/bookings/${own.booking.id}/outcome`,
        {
          data: { outcome: 'arrived' },
        },
      )
      expect((await marked.json()).outcome).toBe('arrived')
      const foreign = await masterPage.request.patch(
        `/api/master/${SLUG}/bookings/${other.booking.id}/outcome`,
        {
          data: { outcome: 'no_show' },
        },
      )
      expect(foreign.status()).toBe(403)

      await masterPage.goto('/master')
      await expect(masterPage).toHaveURL(new RegExp(`/master/${SLUG}$`))
      await expect(masterPage.getByRole('heading', { name: /Мой день/ })).toBeVisible()
      await expect(masterPage.getByText(master.name).first()).toBeVisible()
      await expect(masterPage.getByRole('group', { name: 'День' })).toBeVisible()
    } finally {
      await masterContext.close()
      await saveMaster(master.phone ?? '')
    }

    // A number that is not a master's gets no day.
    const strangerContext = await browser.newContext()
    const stranger = await strangerContext.newPage()
    await signInViaApi(stranger, randomClientPhone())
    expect((await stranger.request.get(`/api/master/${SLUG}/day?date=2026-01-01`)).status()).toBe(
      403,
    )
    await strangerContext.close()
  })
})
