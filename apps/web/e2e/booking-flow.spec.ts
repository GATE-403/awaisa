import { expect, test } from '@playwright/test'
import {
  bookingSteps,
  cancelViaApi,
  editStep,
  pickFirstFreeSlot,
  primaryAction,
  readStoredBookings,
  revealNextSlot,
  settledBox,
  submitBooking,
} from './helpers'

test.describe('User flow: booking', () => {
  test.afterEach(async ({ page }) => {
    const stored = await readStoredBookings(page).catch(() => [])
    await Promise.all(stored.map(cancelViaApi))
  })

  test('catalog → business → next free slot → booking opens on that service and time', async ({
    page,
  }) => {
    await page.goto('/')
    // Services lead the catalog; places are the second tab.
    await page.getByRole('tab', { name: /Places/ }).click()
    // The business card (not an offer inside the banner) leads to the business page.
    await page.locator('a[href="/awaisa-studio"]').first().click()
    await expect(page).toHaveURL(/\/awaisa-studio$/)
    await revealNextSlot(page)
    const nextSlot = page.getByRole('complementary', { name: 'Next free time' })
    await expect(nextSlot.getByText(/^(Today|Tomorrow), \d{2}:\d{2}$/)).toBeVisible()
    // The card links to its time once the first free slot is known.
    const card = nextSlot.getByRole('link', { name: /^Book for/ })
    await expect(card).toHaveAttribute('href', /time=\d{2}:\d{2}/)
    const href = (await card.getAttribute('href')) ?? ''
    const time = new URL(href, 'http://local').searchParams.get('time') ?? ''
    await card.click()

    await expect(page).toHaveURL(/\/book\?service=.*time=/)
    const steps = bookingSteps(page)
    // Service and time already lie in the stack of done cards: only the contacts are asked.
    await expect(steps.service).toBeVisible()
    await expect(steps.datetime).toContainText(time)
    await expect(steps.contacts.getByLabel('Name', { exact: true })).toBeVisible()
    await expect(primaryAction(page)).toHaveText(/^(Enter contacts|Book)$/)
  })

  test('full booking: service → master → time → contacts → ticket → cancel', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)

    await steps.service.getByRole('radio', { name: /Мужская стрижка/ }).click()
    await expect(steps.service).toContainText('Мужская стрижка')

    // A service with a single master skips the choice; otherwise take anyone free.
    const anyMaster = steps.specialist.getByRole('radio', { name: /Any specialist/ })
    if (await anyMaster.isVisible()) await anyMaster.click()
    const time = await pickFirstFreeSlot(page)

    await expect(steps.datetime).toContainText(time)
    await steps.contacts.getByLabel('Name', { exact: true }).fill('E2E Тест')
    await steps.contacts.getByLabel('Phone').fill('+996 555 000 111')
    await expect(primaryAction(page)).toHaveText('Book')
    const booked = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/bookings',
    )
    // “You may also like” stays near what was just booked: the shelf asks with `like=`.
    const shelf = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === '/api/recommendations' &&
        new URL(request.url()).searchParams.has('like'),
    )
    await submitBooking(page)

    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()
    const { serviceId } = (await (await booked).json()) as { serviceId: string }
    expect(new URL((await shelf).url()).searchParams.get('like')).toBe(serviceId)
    // No toast over the success screen: it says in plain words what to do next.
    await expect(page.getByText(new RegExp(`Come at ${time}`))).toBeVisible()
    await expect(page.getByRole('article', { name: /^Booking / })).toContainText(time)
    // The sum is said in the sentence and leads the ticket's stub - nobody hunts for it.
    await expect(page.getByText(/Pay at the salon: \d[\d,]*\ssom/)).toBeVisible()
    await expect(page.getByRole('article', { name: /^Booking / })).toContainText(/To pay\s*\d/)

    await page.getByRole('main').getByRole('link', { name: 'My bookings' }).click()
    await expect(page).toHaveURL(/\/bookings$/)
    const ticket = page.getByRole('article', { name: /^Booking / }).first()
    await expect(ticket).toContainText('Мужская стрижка')

    // The ticket alone, large, with a way to save it - like showing it at the door.
    await ticket.getByRole('button', { name: 'Show the ticket' }).click()
    const ticketSheet = page.getByRole('dialog', { name: 'Ticket' })
    await expect(ticketSheet.getByRole('article', { name: /^Booking / })).toBeVisible()
    await expect(ticketSheet.getByRole('button', { name: 'Download', exact: true })).toBeEnabled()
    await ticketSheet.getByRole('button', { name: 'Close', exact: true }).click()
    // Sheets also close by pulling the top bar down.
    await ticket.getByRole('button', { name: 'Show the ticket' }).click()
    const title = ticketSheet.getByRole('heading', { name: 'Ticket' })
    // A pull begun while a slow runner still settles the sheet can be read as a tap: the pull is
    // tried again from where the bar now is, until the sheet has gone.
    await expect(async () => {
      const box = await settledBox(title)
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y + 260, { steps: 8 })
        await page.mouse.up()
      }
      await expect(ticketSheet).toHaveCount(0, { timeout: 2_000 })
    }).toPass({ timeout: 15_000 })

    // Cancelling is immediate (from the pass's “⋯” menu); “Undo” in the toast undoes it.
    const cancelFromMenu = async () => {
      await ticket.getByRole('button', { name: 'More' }).click()
      await page.getByRole('menuitem', { name: 'Cancel booking' }).click()
    }
    await cancelFromMenu()
    await expect(ticket.getByText('Cancelled')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(ticket.getByText('Cancelled')).toHaveCount(0)
    await expect(page.getByRole('region', { name: /Notifications/ })).toContainText(
      'Booking restored',
    )

    await cancelFromMenu()
    await expect(ticket.getByText('Cancelled')).toBeVisible()
    await expect(ticket.getByRole('button', { name: 'Remove from the list' })).toBeVisible()
  })

  test('master page link preselects the master and narrows services', async ({ page }) => {
    // The masters live in their own tab of the place; the anchor opens it.
    await page.goto('/awaisa-studio#masters')
    await page
      .locator('#masters')
      .getByRole('link', { name: /Тимур Абдыкадыров/ })
      .click()

    await expect(page).toHaveURL(/specialist=timur/)
    const steps = bookingSteps(page)
    await expect(steps.service.getByRole('radio')).toHaveCount(2)
    await steps.service.getByRole('radio').first().click()
    await expect(steps.specialist).toContainText('Тимур Абдыкадыров')
    await expect(
      steps.datetime
        .getByRole('group', { name: 'Time' })
        .or(steps.datetime.getByText('This day is fully booked')),
    ).toBeVisible()
  })

  test('services catalog → book a specific service', async ({ page }) => {
    await page.goto('/awaisa-studio/services')
    await page.getByRole('link', { name: /Педикюр/ }).click()

    await expect(page).toHaveURL(/\/awaisa-studio\/book\?service=pedicure/)
    await expect(bookingSteps(page).service).toContainText('Педикюр')
  })

  test('a booking left half-way can be continued from any page', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    await bookingSteps(page)
      .service.getByRole('radio', { name: /Укладка/ })
      .click()
    await page.goto('/')

    const resume = page.getByRole('complementary', { name: 'Unfinished booking' })
    await expect(resume).toContainText('Укладка')
    await resume.getByRole('link', { name: /Continue booking/ }).click()
    await expect(page).toHaveURL(/\/awaisa-studio\/book\?service=styling/)
    await expect(bookingSteps(page).service).toContainText('Укладка')
  })
})

test.describe('Booking: helpful defaults', () => {
  test('a shared location picks the nearest branch; each service says when one can come', async ({
    page,
    context,
  }) => {
    // Lumière (demo seed) has two branches: Асанбай and Ала-Арча; this point is by Ала-Арча.
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ latitude: 42.848, longitude: 74.6015 })
    await page.goto('/lumiere-salon/book')

    // The branch is the first card of the ticket; “Change” opens the list.
    await expect(bookingSteps(page).branch).toContainText('Ала-Арча')
    await editStep(page, 'branch')
    const branches = page.getByRole('group', { name: 'Branch' })
    await expect(branches.getByRole('radio', { name: /Ала-Арча/ })).toBeChecked()
    // Each branch says its address and how far it is; the route leads to the chosen one.
    await expect(branches.getByText(/ · \d+ m$/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Directions to “Ала-Арча” ›' })).toBeVisible()
    await branches.getByRole('radio', { name: /Ала-Арча/ }).click()

    // At least one service row names its first free time today or tomorrow.
    await expect(
      bookingSteps(page)
        .service.getByText(/^(Today|Tomorrow) from \d{2}:\d{2}/)
        .first(),
    ).toBeVisible()
  })

  test('another branch keeps the service and the “any specialist” choice', async ({ page }) => {
    await page.goto('/lumiere-salon/book')
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio').first().click()
    const anyMaster = steps.specialist.getByRole('radio', { name: /Any specialist/ })
    await anyMaster.click()
    const chosenService = (await steps.service.textContent()) ?? ''

    await editStep(page, 'branch')
    const branches = page.getByRole('group', { name: 'Branch' })
    await branches.getByRole('radio', { checked: false }).first().click()

    // Nothing to choose again: the service card stays, the form waits on the time.
    await expect(steps.service).toContainText(chosenService.trim().split(' ')[0] ?? '')
    await expect(primaryAction(page)).toHaveText(/^Choose (a time|\d{2}:\d{2})$/)
  })
})
