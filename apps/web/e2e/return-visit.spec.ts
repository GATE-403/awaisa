import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'
import { API_URL } from './helpers'

const SLUG = 'awaisa-studio'

type Service = {
  id: string
  categoryId: string
  name: string
  description: string
  durationMinutes: number
  price: number
  deposit?: number | null
  rebookDays?: number | null
  isPopular: boolean
  isActive?: boolean
}

test.describe('Return visits', () => {
  test('the owner sets «пора прийти снова» on a service', async ({ page, isMobile }, testInfo) => {
    test.skip(isMobile, 'Runs once: it changes a service')
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get(`/api/manage/${SLUG}`)).json()
    const service: Service = managed.catalog.services.at(-1)
    const restore = () =>
      page.request.put(`/api/manage/${SLUG}/services/${service.id}`, {
        data: {
          categoryId: service.categoryId,
          name: service.name,
          description: service.description,
          durationMinutes: service.durationMinutes,
          price: service.price,
          deposit: service.deposit ?? null,
          rebookDays: service.rebookDays ?? null,
          isPopular: service.isPopular,
          isActive: service.isActive ?? true,
        },
      })

    try {
      await page.goto(`/manage/${SLUG}?tab=services`)
      await page
        .getByRole('button', { name: new RegExp(service.name) })
        .first()
        .click()
      const sheet = page.getByRole('dialog', { name: 'Услуга' })
      await sheet.getByRole('combobox', { name: 'Напомнить прийти снова' }).click()
      await page.getByRole('option', { name: 'Через 4 недели' }).click()
      await sheet.getByRole('button', { name: 'Сохранить' }).click()
      await expect(page.getByText('Услуга сохранена')).toBeVisible()
      const after = await (await page.request.get(`/api/manage/${SLUG}`)).json()
      expect(
        after.catalog.services.find((item: Service) => item.id === service.id).rebookDays,
      ).toBe(28)
    } finally {
      await restore()
    }
  })

  test('a returning client sees «Снова к мастеру» on the catalog', async ({ page }) => {
    const business = await (await fetch(`${API_URL}/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists[0]
    const service = business.catalog.services.find((item: { id: string }) =>
      master.serviceIds.includes(item.id),
    )
    // A visit two weeks ago, kept on this device like any guest booking.
    const startsAt = new Date(Date.now() - 14 * 86_400_000).toISOString()
    await page.addInitScript(
      (snapshot) =>
        window.localStorage.setItem(
          'awaisa:bookings:v2',
          JSON.stringify([{ id: snapshot.id, token: 'e2e-token-0000000000', snapshot }]),
        ),
      {
        id: '00000000-0000-4000-8000-000000000001',
        status: 'confirmed',
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
        specialistId: master.id,
        specialistName: master.name,
        date: startsAt.slice(0, 10),
        time: '12:00',
        startsAt,
        customerName: 'E2E Снова',
        business: { slug: SLUG, name: business.business.name, address: '', phone: '', mapUrl: '' },
      },
    )
    await page.goto('/')
    const again = page.getByRole('region', { name: 'Снова к мастеру' })
    const link = again.getByRole('link', { name: new RegExp(`^Снова: ${service.name}`) })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute(
      'href',
      `/${SLUG}/book?service=${service.id}&specialist=${master.id}`,
    )
  })
})
