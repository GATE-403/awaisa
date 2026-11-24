import { expect, test } from '@playwright/test'
import { adminPhone, formatPhone, randomClientPhone, signInViaApi, TEST_CODE } from './account'
import {
  bookingSteps,
  cancelViaApi,
  pickFirstFreeSlot,
  readStoredBookings,
  submitBooking,
} from './helpers'

test.describe('Account: sign in with a code in Telegram', () => {
  test.afterEach(async ({ page }) => {
    const stored = await readStoredBookings(page).catch(() => [])
    await Promise.all(stored.map(cancelViaApi))
  })

  test('new client signs in with a code, names themselves and lands where they started', async ({
    page,
  }) => {
    const phone = randomClientPhone()
    await page.goto('/login?next=/bookings')

    await page.getByLabel('Phone number').fill(phone)
    await expect(page.getByText('The code comes in Telegram')).toBeVisible()
    await page.getByRole('button', { name: 'Get a code in Telegram' }).click()
    await expect(
      page.getByText(`The code was sent in Telegram to ${formatPhone(phone)}`),
    ).toBeVisible()
    // No SMS anywhere: the code goes to Telegram only.
    await expect(page.getByText(/SMS/)).toHaveCount(0)

    const code = page.getByLabel('Confirmation code')
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    await code.fill(TEST_CODE)

    await page.getByLabel('Name').fill('E2E Тест')
    await page.getByRole('button', { name: 'Done' }).click()

    // The greeting is spoken (an `output`) and uses the first name only.
    const greeting = page.getByRole('status')
    await expect(greeting).toContainText('Hi, E2E')
    await expect(greeting).toContainText('You are signed in')
    await expect(page).toHaveURL(/\/bookings$/)
    // The account is one row over the records: the name (the number lives in «Settings»).
    await expect(page.getByRole('region', { name: 'Profile' })).toContainText('E2E Тест')
  })

  test('the name is changed in a sheet from “Settings”', async ({ page }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Тест')
    // Settings are a screen of their own behind the account row's gear, kept in `?tab=settings`.
    await page.goto('/bookings?tab=settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    const tabs = page.getByRole('tablist', { name: 'Profile' })
    await expect(tabs).toHaveCount(0)
    await page.getByRole('button', { name: 'Bookings' }).click()
    await expect(page).toHaveURL(/[?&]tab=bookings/)
    await expect(tabs.getByRole('tab', { name: /^Bookings/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    // Ahead and past are one «Bookings» tab now; an old «?tab=history» link lands on it too.
    await page.goto('/bookings?tab=history')
    await expect(tabs.getByRole('tab', { name: /^Bookings/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await tabs.getByRole('tab', { name: /^Favourites/ }).click()
    await expect(page).toHaveURL(/[?&]tab=favorites/)
    await expect(tabs.getByRole('tab', { name: /^Favourites/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const profile = page.getByRole('region', { name: 'Profile' })
    await profile.getByRole('button', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/[?&]tab=settings/)
    await page.getByRole('button', { name: 'Sign out' }).click()
    // Signed out at once, on the catalog; the session is gone on the server too.
    await expect(page).toHaveURL((url) => url.pathname === '/')
    expect((await page.request.get('/api/me')).status()).toBe(401)
    // The page is a guest's again: a sign-in row and no gear to the settings.
    await page.goto('/bookings')
    await expect(profile.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(profile.getByRole('button', { name: 'Settings' })).toHaveCount(0)
  })

  test('a sign-in link cannot send the client to another site afterwards', async ({ page }) => {
    // Browsers read a backslash as «/»: this path would open evil.example after the code.
    await page.goto(`/login?next=${encodeURIComponent('/\\evil.example')}`)
    await page.getByLabel('Phone number').fill(randomClientPhone())
    await page.getByRole('button', { name: 'Get a code in Telegram' }).click()
    await page.getByLabel('Confirmation code').fill(TEST_CODE)
    await page.getByLabel('Name').fill('E2E Тест')
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/bookings$/)
  })

  test('the profile takes a photo: it shows in place of the initials and can be removed', async ({
    page,
  }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Photo')
    await page.goto('/bookings')
    const profile = page.getByRole('region', { name: 'Profile' })
    await expect(profile.getByRole('heading', { name: 'E2E Photo' })).toBeVisible()
    await profile.getByLabel('Profile photo file').setInputFiles({
      name: 'me.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC',
        'base64',
      ),
    })
    await expect(profile.getByRole('img', { name: 'E2E Photo' })).toBeVisible()
    const me = await (await page.request.get('/api/me')).json()
    expect(me.avatarUrl).toMatch(/^\/api\/media\/customers\/.+\.webp$/)

    await profile.getByRole('button', { name: 'Profile photo' }).click()
    await page.getByRole('menuitem', { name: 'Delete photo' }).click()
    await expect(profile.getByRole('img', { name: 'E2E Photo' })).toHaveCount(0)
    expect((await (await page.request.get('/api/me')).json()).avatarUrl).toBeNull()
  })

  test('without a Telegram Gateway only the bot is offered', async ({ page }) => {
    await page.route('**/api/auth/telegram', (route) =>
      route.fulfill({
        json: { isAvailable: true, botUsername: 'awaisa_e2e_bot', isCodeAvailable: false },
      }),
    )
    await page.route('**/api/auth/telegram/check', (route) =>
      route.fulfill({ json: { status: 'pending' } }),
    )
    await page.goto('/login')

    const bot = page.getByRole('link', { name: 'Sign in with Telegram' })
    await expect(bot).toBeVisible()
    // Alone it is white: the accent blue clashed with Telegram's own blue mark.
    await expect(bot).toHaveAttribute('data-variant', 'contrast')
    await expect(bot).toHaveAttribute('href', /^https:\/\/t\.me\/awaisa_e2e_bot\?start=login_/)
    await expect(page.getByLabel('Phone number')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Get a code/ })).toHaveCount(0)
  })

  test('a half-typed number is not sent: the page says what is missing', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Phone number').fill('555 12')
    await page.getByRole('button', { name: 'Get a code in Telegram' }).click()

    await expect(
      page.getByText('The number is incomplete: it needs 9 digits after +996'),
    ).toBeVisible()
    await expect(page.getByLabel('Confirmation code')).toHaveCount(0)
  })

  test('a wrong code explains how many attempts are left', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Phone number').fill(randomClientPhone())
    await page.getByRole('button', { name: 'Get a code in Telegram' }).click()
    // Square cells in every browser: the kit's capsule `.input` must not win over `.cell`.
    const cell = page.getByLabel('Confirmation code')
    const box = await cell.boundingBox()
    expect(box && Math.round(box.width)).toBe(box && Math.round(box.height))
    await expect(cell).toHaveCSS('border-radius', '12px')
    await page.getByLabel('Confirmation code').fill('000000')

    await expect(page.getByText('Wrong code, attempts left: 4')).toBeVisible()
    await expect(page.getByRole('button', { name: /Send again in \d+ s/ })).toBeDisabled()
  })

  test('profile and bookings are one page: guests see their device bookings and a sign-in card', async ({
    page,
  }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/bookings$/)
    await page
      .getByRole('region', { name: 'Profile' })
      .getByRole('link', { name: 'Sign in' })
      .click()
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)bookings/)
  })

  test('signed-in client books without typing a phone and sees it on any device', async ({
    page,
    browser,
  }) => {
    const phone = randomClientPhone()
    await signInViaApi(page, phone)
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)

    await steps.specialist.getByRole('radio', { name: /Any specialist/ }).click()
    const time = await pickFirstFreeSlot(page)
    await expect(steps.contacts.getByLabel('Name')).toHaveValue('E2E Тест')
    await expect(steps.contacts.getByLabel('Phone')).toHaveCount(0)
    await expect(steps.contacts).toContainText(formatPhone(phone))
    await submitBooking(page)
    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()

    // Same session cookie, empty localStorage: the list must come from the account, not the device.
    const otherDevice = await browser.newContext({
      storageState: { cookies: await page.context().cookies(), origins: [] },
    })
    const otherPage = await otherDevice.newPage()
    await otherPage.goto('/bookings')
    await expect(otherPage.getByRole('article', { name: /^Booking / })).toContainText(time)
    await otherDevice.close()
  })
})

test.describe('Salon admin', () => {
  test('non-staff accounts cannot open the schedule', async ({ page }) => {
    await signInViaApi(page, randomClientPhone())
    await page.goto('/manage/awaisa-studio')
    await expect(page.getByRole('heading', { name: /No access/ })).toBeVisible()
  })

  test('staff see the day by master, close time and open it again', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')

    await expect(page.getByRole('region', { name: 'Айгерим Садыкова' })).toBeVisible()
    // Tomorrow: the strip also holds past days, which can't be closed.
    await page.getByRole('group', { name: 'Day' }).locator('[data-today] + button').click()

    // The phone and desktop runs close time for the same master and day at once: each finds its
    // own block by its own reason.
    const reason = `E2E break ${testInfo.project.name}`
    await page.getByRole('button', { name: 'Break' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Reason').fill(reason)
    await dialog.getByRole('button', { name: 'Done' }).click()
    const block = page.getByText(reason, { exact: true }).locator('..')
    await expect(block).toBeVisible()

    // A real visit may sit at the same time and cover the block: press its button directly.
    await block
      .getByRole('button', { name: /^Open \d{2}:\d{2}.\d{2}:\d{2} again$/ })
      .dispatchEvent('click')
    await expect(page.getByText(reason, { exact: true })).toHaveCount(0)
  })

  test('staff cancel a client booking and the client sees it cancelled', async ({
    page,
    browser,
  }, testInfo) => {
    const client = await browser.newContext()
    const clientPage = await client.newPage()
    const clientPhone = randomClientPhone()
    await signInViaApi(clientPage, clientPhone, 'E2E Клиент')
    await clientPage.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(clientPage)
      .specialist.getByRole('radio', { name: /Any specialist/ })
      .click()
    await pickFirstFreeSlot(clientPage)
    await submitBooking(clientPage)
    await expect(clientPage.getByRole('heading', { name: 'You are booked' })).toBeVisible()
    const booked = (await clientPage.request
      .get('/api/me/bookings')
      .then((response) => response.json())) as {
      date: string
    }[]

    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/manage/awaisa-studio')
    const dayButtons = page.getByRole('group', { name: 'Day' }).getByRole('button')
    await dayButtons.first().waitFor()
    const dayIndex = await dayButtons.evaluateAll(
      (buttons, date) => buttons.findIndex((button) => button.getAttribute('data-day') === date),
      booked[0]?.date ?? '',
    )
    if (dayIndex > 0) await dayButtons.nth(dayIndex).click()

    const phonePattern = clientPhone.replace('+', '\\+')
    await page.getByRole('button', { name: new RegExp(phonePattern) }).click()
    // The visit's inspector (a popover with a mouse, a sheet on phones): «⋯» → «Cancel booking».
    await page.getByRole('dialog').getByRole('button', { name: 'More actions' }).click()
    await page.getByRole('menuitem', { name: 'Cancel booking' }).click()
    await expect(
      page.getByRole('button', { name: new RegExp(`${phonePattern}, cancelled`) }),
    ).toBeVisible()

    await clientPage.goto('/bookings')
    await expect(clientPage.getByRole('article', { name: /^Booking / }).first()).toContainText(
      'Cancelled',
    )
    await client.close()
  })
})
