import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC',
  'base64',
)

test.describe('«Мой день»: the master’s share and photos of their work', () => {
  test('the day shows the master’s percent of its money; an arrived visit takes a work photo tagged with it', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, {
      services: [
        { name: 'Стрижка', durationMinutes: 60, price: 1000 },
        { name: 'Борода', durationMinutes: 30, price: 600 },
      ],
      masters: ['Азамат', 'Бекзат'],
    })
    const [azamat] = business.masters
    const beard = business.services.find((service) => service.name === 'Борода')
    if (!azamat || !beard) throw new Error('A master and the beard service expected')
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${azamat.id}`, {
          data: {
            name: azamat.name,
            role: 'Мастер',
            serviceIds: azamat.serviceIds,
            phone: masterPhone,
            commissionPercent: 40,
          },
        })
      ).ok(),
    ).toBe(true)
    const visit = (serviceId: string, name: string) =>
      createVisit({
        slug: business.slug,
        serviceId,
        specialistId: azamat.id,
        name,
        daysBack: 1,
      })
    // Yesterday: a beard paid 1 500, a haircut still at its 1 000, a no-show that earns nothing.
    const paid = await visit(beard.id, 'E2E Борода')
    const waiting = await visit(business.service.id, 'E2E Стрижка')
    const missed = await visit(business.service.id, 'E2E Неявка')
    expect(new Set([paid.date, waiting.date, missed.date]).size).toBe(1)
    const mark = (id: string, data: object) =>
      page.request.patch(`/api/manage/${business.slug}/bookings/${id}/outcome`, { data })
    expect((await mark(paid.id, { outcome: 'arrived', paidAmount: 1500 })).ok()).toBe(true)
    expect((await mark(missed.id, { outcome: 'no_show' })).ok()).toBe(true)

    const masterContext = await browser.newContext()
    const master = await masterContext.newPage()
    try {
      await signInViaApi(master, masterPhone, 'E2E Мастер')
      await master.goto(`/master/${business.slug}`)
      await master.locator(`[data-day="${paid.date}"]`).click()
      // 40% of 1 500 + 1 000; the no-show is not money.
      await expect(master.getByText('ваши 40%')).toBeVisible()
      await expect(master.getByText(/^1\s000\s*сом$/)).toBeVisible()

      // Only the arrived visit offers a photo.
      const arrived = master.getByRole('listitem').filter({ hasText: 'E2E Борода' })
      await expect(
        master.getByRole('listitem').filter({ hasText: 'E2E Стрижка' }).getByRole('button', {
          name: 'Фото работы',
        }),
      ).toHaveCount(0)
      await arrived.getByLabel(`Фото работы ${paid.id}`).setInputFiles({
        name: 'work.png',
        mimeType: 'image/png',
        buffer: TINY_PNG,
      })
      await expect(master.getByText('Фото в «Образах»')).toBeVisible()
      await expect(arrived.getByRole('button', { name: 'Ещё фото работы' })).toBeVisible()
    } finally {
      await masterContext.close()
    }

    const photos = await (await page.request.get(`/api/manage/${business.slug}/work-photos`)).json()
    expect(photos).toEqual([
      expect.objectContaining({
        serviceId: beard.id,
        serviceName: 'Борода',
        specialistId: azamat.id,
        isHidden: false,
      }),
    ])
  })

  test('without a percent the day shows all its money', async ({ page, browser }) => {
    const business = await createOwnBusiness(page)
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${business.master.id}`, {
          data: {
            name: business.master.name,
            role: 'Мастер',
            serviceIds: business.master.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      daysBack: 1,
    })

    const masterContext = await browser.newContext()
    const master = await masterContext.newPage()
    try {
      await signInViaApi(master, masterPhone, 'E2E Мастер')
      await master.goto(`/master/${business.slug}`)
      await master.locator(`[data-day="${visit.date}"]`).click()
      await expect(master.getByText('за день', { exact: true })).toBeVisible()
      await expect(master.getByText(/^1\s000\s*сом$/)).toBeVisible()
      await expect(master.getByText(/^ваши \d+%$/)).toHaveCount(0)
    } finally {
      await masterContext.close()
    }
  })
})
