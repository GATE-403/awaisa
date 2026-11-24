import { mockCreateBooking, succeed } from '../../../apps/web/e2e/fixtures'
import { createPastVisit, withDb } from '../../../apps/web/e2e/visits'
import { FILES } from '../flows'
import {
  bookAs,
  randomPhone,
  reviewLink,
  SLUG,
  signedInRequest,
  TEST_CODE,
  withLock,
} from '../lib/data'
import { expect, test } from '../lib/fixture'
import { KeyboardWalker } from '../lib/keyboard'

// The same goals without a mouse or a finger: Tab, Shift+Tab, Enter, Space, arrows, Esc.
// Runs on the devices marked `keyboard` in personas.ts (a laptop, and the same at 200% zoom).

test.describe('Только клавиатура @keyboard @a11y', () => {
  test('Поиск в каталоге', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: поиск в каталоге')
    const { page } = ux
    const keys = new KeyboardWalker(ux)
    await ux.goto('/')
    await page.locator('main [data-card]').first().waitFor()
    await ux.step('Каталог', FILES.catalog)
    await keys.tabTo({ name: /Search salons and specialists/ }, 'поле поиска')
    await keys.type('стрижка')
    await keys.press('Enter')
    await page.waitForURL(/[?&]q=/)
    await page.locator('main [data-card]').first().waitFor()
    await ux.step('Результаты', FILES.catalog)
    await keys.tabTo({ within: 'main [data-card]', role: 'a' }, 'ссылка первой карточки')
    await keys.press('Enter')
    await page.waitForURL((url) => url.pathname !== '/')
    await ux.step('Открыто с клавиатуры', FILES.bookingSheet)
    ux.complete()
  })

  test('Запись к мастеру', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: запись')
    const { page } = ux
    const keys = new KeyboardWalker(ux)
    await mockCreateBooking(page, succeed)
    await ux.goto(`/${SLUG}/book`)
    await page.locator('#step-service').waitFor()
    await ux.step('Запись: услуга', FILES.service)

    await keys.tabTo({ within: '#step-service', role: 'radio' }, 'первая услуга')
    await keys.press('Space')
    await expect(page.locator('#step-specialist, #step-datetime').first()).toBeVisible()
    const anyMaster = page
      .locator('#step-specialist')
      .getByRole('radio', { name: /Any specialist/ })
    if (await anyMaster.isVisible()) {
      await keys.tabTo({ within: '#step-specialist', role: 'radio' }, 'мастер')
      await keys.press('Space')
    }
    const times = page
      .getByRole('group', { name: 'Time', exact: true })
      .getByRole('button', { disabled: false })
    await times.first().waitFor()
    await ux.step('Запись: время', FILES.time)
    await keys.tabTo(
      { within: 'fieldset[aria-label="Time"], [role="group"][aria-label="Time"]' },
      'свободное время',
    )
    await keys.press('Enter')

    await page.getByLabel('Name', { exact: true }).waitFor()
    await keys.tabTo({ name: /^Name/ }, 'поле «Имя»')
    await keys.type('E2E UX Клавиатура')
    await keys.tabTo({ name: /^Phone/ }, 'поле «Телефон»')
    await keys.type('555000111')
    await ux.step('Запись: контакты', FILES.contacts)
    await keys.tabTo({ name: /^Book$/ }, 'кнопка «Записаться»')
    await keys.press('Enter')
    await expect(page.getByRole('heading', { name: 'You are booked' })).toBeVisible()
    await ux.step('Вы записаны', FILES.success)
    ux.complete()
  })

  test('Вход по коду', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: вход по коду')
    const { page } = ux
    const keys = new KeyboardWalker(ux)
    await ux.goto('/login?next=/bookings')
    await page.getByLabel('Phone number').waitFor()
    await keys.tabTo({ name: /Phone number/ }, 'поле номера')
    await keys.type(randomPhone().replace('+996', ''))
    await keys.press('Enter')
    await page.getByLabel('Confirmation code').waitFor()
    await ux.step('Код', FILES.login)
    // The code field takes the focus by itself, or is the next stop.
    const isOnCode = await page
      .getByLabel('Confirmation code')
      .evaluate((element) => element === document.activeElement)
    if (!isOnCode) await keys.tabTo({ name: /Confirmation code/ }, 'поле кода')
    await keys.type(TEST_CODE)
    await page.getByLabel('Name', { exact: true }).waitFor()
    const isOnName = await page
      .getByLabel('Name', { exact: true })
      .evaluate((element) => element === document.activeElement)
    if (!isOnName) await keys.tabTo({ name: /^Name/ }, 'поле «Имя»')
    await keys.type('E2E UX Клавиатура')
    await keys.press('Enter')
    await expect(page.getByRole('region', { name: 'Profile' })).toBeVisible()
    await ux.step('Профиль', FILES.profile)
    ux.complete()
  })

  test('Отзыв по ссылке', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: отзыв')
    await withLock('rating', async () => {
      const { page } = ux
      const keys = new KeyboardWalker(ux)
      const { booking, specialist } = await createPastVisit('E2E UX Отзыв')
      const saved = await withDb(async (client) => {
        const { rows } = await client.query('SELECT "rating" FROM "specialists" WHERE "id" = $1', [
          specialist.id,
        ])
        return rows[0]?.rating ?? null
      })
      try {
        await ux.goto(reviewLink(booking.id))
        await page.getByRole('button', { name: 'Send review' }).waitFor()
        await ux.step('Оценка', FILES.review)
        await keys.tabTo({ role: 'radio', name: / of 5/ }, 'звёзды')
        // Arrows move along a radio group; the last star is five.
        for (let star = 0; star < 4; star += 1) await keys.press('ArrowRight')
        await expect(page.getByLabel(/^5 of 5/)).toBeChecked()
        await keys.tabTo({ name: /Tell us more/ }, 'поле отзыва')
        await keys.type('E2E UX: с клавиатуры')
        await keys.tabTo({ name: /^Send review$/ }, 'кнопка «Отправить отзыв»')
        await keys.press('Enter')
        await expect(page.getByText(/Thank/).first()).toBeVisible()
        await ux.step('Отправлено', FILES.review)
        ux.complete()
      } finally {
        await withDb((client) =>
          client.query('UPDATE "specialists" SET "rating" = $2 WHERE "id" = $1', [
            specialist.id,
            saved,
          ]),
        )
      }
    })
  })

  test('Талон и отмена записи', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: талон и отмена')
    const { page } = ux
    const keys = new KeyboardWalker(ux)
    const phone = randomPhone()
    const account = await signedInRequest(phone, 'E2E UX Клавиатура')
    await bookAs(account, 'E2E UX Клавиатура', phone, 1)
    await page.context().addCookies((await account.storageState()).cookies)
    await account.dispose()

    await ux.goto('/bookings')
    const ticket = page.getByRole('article', { name: /^Booking / }).first()
    await ticket.waitFor()
    await ux.step('Профиль', FILES.profile)
    await keys.tabTo({ name: /^Show the ticket$/ }, '«Показать талон»')
    await keys.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Ticket' })
    await sheet.waitFor()
    await ux.step('Талон', FILES.ticket)
    await keys.press('Escape')
    await expect(sheet).toBeHidden()
    await keys.expectFocusBack(/Show the ticket/, '«Показать талон»')

    await keys.tabTo({ name: /^More$/ }, 'меню «Ещё»')
    await keys.press('Enter')
    const cancel = page.getByRole('menuitem', { name: 'Cancel booking' })
    await cancel.waitFor()
    for (let index = 0; index < 4; index += 1) {
      if (await cancel.evaluate((element) => element === document.activeElement)) break
      await keys.press('ArrowDown')
    }
    await keys.press('Enter')
    await expect(ticket.getByText('Cancelled')).toBeVisible()
    await ux.step('Отменено', [...FILES.profile, ...FILES.toast])
    // Can a keyboard user reach «Вернуть» before the toast leaves? F6 jumps to the toasts.
    const undo = page.getByRole('button', { name: 'Undo' })
    await keys.press('F6')
    const isOnUndo = await undo
      .evaluate(
        (element) =>
          element === document.activeElement ||
          element.closest('[aria-live]')?.contains(document.activeElement),
      )
      .catch(() => false)
    if (!isOnUndo) {
      try {
        await keys.tabTo({ name: /^Undo$/ }, '«Вернуть» в тосте')
      } catch {
        // tabTo already recorded the finding.
      }
    }
    ux.complete()
  })
})
