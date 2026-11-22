import { expect, test } from '@playwright/test'
import { createOwnBusiness, createVisit } from './business'

const LINE = 'Подтверждения и напоминания о визитах приходят в WhatsApp, а без него по SMS.'

// The e2e API runs the WhatsApp log driver (the default outside production): client messages are
// written to its log instead of going to Meta. Which channel took a message is unit-tested
// (`client-messages.service.spec.ts`); here is what an owner and a client see of it.
test.describe('WhatsApp for client messages', () => {
  test('the cabinet says clients hear about visits in WhatsApp while it is on', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)

    const config = await page.request.get('/api/notifications/config')
    expect(await config.json()).toEqual({ isWhatsappOn: true })

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    await expect(page.getByRole('heading', { name: 'Клиентам' })).toBeVisible()
    await expect(page.getByText(LINE)).toBeVisible()
  })

  test('with WhatsApp off the cabinet draws nothing about it (SMS as always)', async ({ page }) => {
    const business = await createOwnBusiness(page)
    await page.route('**/api/notifications/config', (route) =>
      route.fulfill({ json: { isWhatsappOn: false } }),
    )
    const answered = page.waitForResponse('**/api/notifications/config')

    await page.goto(`/manage/${business.slug}?tab=notifications`)
    await answered
    await expect(page.getByText(/Новые записи, отмены и отзывы/)).toBeVisible()
    await expect(page.getByText(LINE)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Клиентам' })).toHaveCount(0)
  })

  test('a booking with its confirmation, then a move, go through with the WhatsApp channel on', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'API only')
    const business = await createOwnBusiness(page)
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      fromDay: 1,
    })

    const viewed = await page.request.get(`/api/bookings/${visit.id}`, {
      headers: { 'x-booking-token': visit.token },
    })
    expect(viewed.ok(), await viewed.text()).toBe(true)
    expect((await viewed.json()).status).toBe('confirmed')

    // The move texts the client again (WhatsApp here); a message never holds the request up.
    const moved = await page.request.patch(`/api/bookings/${visit.id}`, {
      headers: { 'x-booking-token': visit.token },
      // The only booking of a business of the test's own: any other hour of that day is free.
      data: { date: visit.date, time: visit.time === '15:00' ? '16:00' : '15:00' },
    })
    expect(moved.ok(), await moved.text()).toBe(true)
  })
})
