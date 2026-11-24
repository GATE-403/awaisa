import { expect, test } from '@playwright/test'
import { randomClientPhone } from './account'
import {
  API_URL,
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  readStoredBookings,
  submitBooking,
} from './helpers'

type FeedItem = {
  id: string
  business: { slug: string }
  service: { id: string } | null
  specialist: { id: string } | null
  likes?: number
}

// The three catalog cards each do their own thing: a work books its look (“I want this look”), a place
// leafs through its pictures and books its next free times, a service says how its price compares.
test.describe('Catalog cards', () => {
  test.afterEach(async ({ page }) => {
    const stored = await readStoredBookings(page).catch(() => [])
    await Promise.all(stored.map(cancelViaApi))
  })

  test('“I want this look” books the work’s service and master with the photo as the look', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one booking is enough; the card itself is checked on phones below')
    await page.goto('/')
    // A work of a seeded place: other specs add works to their own “E2E …” places, which come first
    // in the catalog and may lack a tagged service or master.
    const want = page
      .getByRole('link', { name: 'I want this look' })
      .and(page.locator(':not([href^="/e2e-"])'))
      .first()
    await want.scrollIntoViewIfNeeded()
    const href = new URL((await want.getAttribute('href')) ?? '', 'http://x')
    const lookId = href.searchParams.get('look')
    expect(lookId).toBeTruthy()

    await want.click()
    await expect(page).toHaveURL(/\/book\?.*look=/)
    const steps = bookingSteps(page)
    const anyMaster = steps.specialist.getByRole('radio', { name: /Any specialist/ })
    if (await anyMaster.isVisible()) await anyMaster.click()
    await pickFirstFreeSlot(page)
    await steps.contacts.getByLabel('Name', { exact: true }).fill('E2E Тест')
    await steps.contacts.getByLabel('Phone').fill(randomClientPhone())
    // The look waits beside the note, with a way to drop it.
    const look = page.getByRole('img', { name: 'Photo of the look you want' })
    await expect(look).toBeVisible()

    const booked = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/bookings',
    )
    await submitBooking(page)
    const request = (await booked).request().postDataJSON() as { lookPhotoId?: string }
    expect(request.lookPhotoId).toBe(lookId)
    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()

    const [stored] = await readStoredBookings(page)
    const view = await (
      await page.request.get(`/api/bookings/${stored?.id}`, {
        headers: { 'x-booking-token': stored?.token ?? '' },
      })
    ).json()
    // The photo's own address: an upload (`/api/media/…`) or a picture hotlinked by the seed.
    expect(view.lookPhotoUrl).toMatch(/^(https?:\/\/|\/api\/media\/)/)
  })

  test('a photo of another place is dropped, never refused', async ({ request, isMobile }) => {
    test.skip(isMobile, 'API only')
    const feed: { items: FeedItem[] } = await (await request.get(`${API_URL}/feed`)).json()
    const photo = feed.items.find((item) => item.business.slug !== 'awaisa-studio')
    expect(photo).toBeTruthy()
    const business = await (await request.get(`${API_URL}/businesses/awaisa-studio`)).json()
    const specialist = business.catalog.specialists[0]
    const serviceId = specialist.serviceIds[0]
    for (let offset = 1; offset <= 14; offset += 1) {
      const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
        .toISOString()
        .slice(0, 10)
      const availability = await (
        await request.get(
          `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
        )
      ).json()
      const slot = availability.slots.find((item: { isAvailable: boolean }) => item.isAvailable)
      if (!slot) continue
      const response = await request.post(`${API_URL}/bookings`, {
        data: {
          serviceId,
          specialistId: specialist.id,
          date,
          time: slot.time,
          name: 'E2E Образец',
          phone: randomClientPhone(),
          comment: '',
          smsConfirmation: false,
          lookPhotoId: photo?.id,
        },
      })
      expect(response.status()).toBe(201)
      const booking = await response.json()
      expect(booking.lookPhotoUrl).toBeNull()
      await cancelViaApi({ id: booking.id, token: booking.cancelToken })
      return
    }
    throw new Error('No free slots in the booking horizon')
  })

  test('a work is liked from its heart and keeps its own look', async ({ page }) => {
    await page.goto('/')
    const tile = page
      .locator('[data-card]')
      .filter({ has: page.getByText('I want this look') })
      .first()
    await tile.scrollIntoViewIfNeeded()
    const heart = tile.getByRole('button', { name: /^Likes/ })
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    const before = Number((await heart.getAttribute('aria-label'))?.match(/\d+/)?.[0] ?? 0)
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
    await expect(heart).toHaveAttribute('aria-label', `Likes: ${before + 1}`)
    // And back, so the shared count stays as the seed left it.
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
  })

  test('a place leafs through its pictures and books its next free time', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /Places/ }).click()
    const card = page
      .locator('[data-card][data-gallery]')
      .filter({ has: page.locator('[data-dot]') })
    await expect(card.first()).toBeVisible()
    const first = card.first()
    const dots = first.locator('[data-dot]')
    await expect(dots.nth(0)).toHaveAttribute('data-current', '')
    // A swipe is the gallery scrolling by one picture.
    await first.locator('[data-scrolls]').evaluate((track) => {
      track.scrollTo({ left: track.clientWidth })
    })
    await expect(dots.nth(1)).toHaveAttribute('data-current', '')
    await expect(dots.nth(0)).not.toHaveAttribute('data-current', '')

    // The next free times are capsules that open the booking on that time.
    const time = page.locator('main a[href*="/book?date="]').first()
    await time.scrollIntoViewIfNeeded()
    const label = (await time.textContent())?.match(/\d{2}:\d{2}/)?.[0]
    await time.click()
    await expect(page).toHaveURL(new RegExp(`/book\\?date=\\d{4}-\\d{2}-\\d{2}&time=${label}`))
    await expect(bookingSteps(page).service).toBeVisible()
  })

  test('offer prices are compared only with enough places', async ({ request, isMobile }) => {
    test.skip(isMobile, 'API only')
    const offers: { cheaperThanPercent?: number | null }[] = await (
      await request.get(`${API_URL}/businesses/offers?limit=60`)
    ).json()
    for (const offer of offers) {
      const share = offer.cheaperThanPercent
      if (share === null || share === undefined) continue
      expect(share).toBeGreaterThanOrEqual(0)
      expect(share).toBeLessThanOrEqual(100)
    }
  })
})
