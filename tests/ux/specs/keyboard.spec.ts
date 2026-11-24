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
    await keys.tabTo({ name: /Поиск салонов и мастеров/ }, 'поле поиска')
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
    const anyMaster = page.locator('#step-specialist').getByRole('radio', { name: /Любой мастер/ })
    if (await anyMaster.isVisible()) {
      await keys.tabTo({ within: '#step-specialist', role: 'radio' }, 'мастер')
      await keys.press('Space')
    }
    const times = page
      .getByRole('group', { name: 'Время' })
      .getByRole('button', { disabled: false })
    await times.first().waitFor()
    await ux.step('Запись: время', FILES.time)
    await keys.tabTo(
      { within: 'fieldset[aria-label="Время"], [role="group"][aria-label="Время"]' },
      'свободное время',
    )
    await keys.press('Enter')

    await page.getByLabel('Имя').waitFor()
    await keys.tabTo({ name: /^Имя/ }, 'поле «Имя»')
    await keys.type('E2E UX Клавиатура')
    await keys.tabTo({ name: /^Телефон/ }, 'поле «Телефон»')
    await keys.type('555000111')
    await ux.step('Запись: контакты', FILES.contacts)
    await keys.tabTo({ name: /^Записаться$/ }, 'кнопка «Записаться»')
    await keys.press('Enter')
    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await ux.step('Вы записаны', FILES.success)
    ux.complete()
  })

  test('Вход по коду', async ({ ux }) => {
    ux.begin('keyboard', 'Клавиатура: вход по коду')
    const { page } = ux
    const keys = new KeyboardWalker(ux)
    await ux.goto('/login?next=/bookings')
    await page.getByLabel('Номер телефона').waitFor()
    await keys.tabTo({ name: /Номер телефона/ }, 'поле номера')
    await keys.type(randomPhone().replace('+996', ''))
    await keys.press('Enter')
    await page.getByLabel('Код подтверждения').waitFor()
    await ux.step('Код', FILES.login)
    // The code field takes the focus by itself, or is the next stop.
    const isOnCode = await page
      .getByLabel('Код подтверждения')
      .evaluate((element) => element === document.activeElement)
    if (!isOnCode) await keys.tabTo({ name: /Код подтверждения/ }, 'поле кода')
    await keys.type(TEST_CODE)
    await page.getByLabel('Имя').waitFor()
    const isOnName = await page
      .getByLabel('Имя')
      .evaluate((element) => element === document.activeElement)
    if (!isOnName) await keys.tabTo({ name: /^Имя/ }, 'поле «Имя»')
    await keys.type('E2E UX Клавиатура')
    await keys.press('Enter')
    await expect(page.getByRole('region', { name: 'Профиль' })).toBeVisible()
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
        await page.getByRole('button', { name: 'Отправить отзыв' }).waitFor()
        await ux.step('Оценка', FILES.review)
        await keys.tabTo({ role: 'radio', name: /из 5/ }, 'звёзды')
        // Arrows move along a radio group; the last star is five.
        for (let star = 0; star < 4; star += 1) await keys.press('ArrowRight')
        await expect(page.getByLabel(/^5 из 5/)).toBeChecked()
        await keys.tabTo({ name: /Расскажите подробнее/ }, 'поле отзыва')
        await keys.type('E2E UX: с клавиатуры')
        await keys.tabTo({ name: /^Отправить отзыв$/ }, 'кнопка «Отправить отзыв»')
        await keys.press('Enter')
        await expect(page.getByText(/Спасибо/).first()).toBeVisible()
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
    const ticket = page.getByRole('article', { name: /^Запись / }).first()
    await ticket.waitFor()
    await ux.step('Профиль', FILES.profile)
    await keys.tabTo({ name: /^Показать талон$/ }, '«Показать талон»')
    await keys.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Талон' })
    await sheet.waitFor()
    await ux.step('Талон', FILES.ticket)
    await keys.press('Escape')
    await expect(sheet).toBeHidden()
    await keys.expectFocusBack(/Показать талон/, '«Показать талон»')

    await keys.tabTo({ name: /^Ещё$/ }, 'меню «Ещё»')
    await keys.press('Enter')
    const cancel = page.getByRole('menuitem', { name: 'Отменить запись' })
    await cancel.waitFor()
    for (let index = 0; index < 4; index += 1) {
      if (await cancel.evaluate((element) => element === document.activeElement)) break
      await keys.press('ArrowDown')
    }
    await keys.press('Enter')
    await expect(ticket.getByText('Отменена')).toBeVisible()
    await ux.step('Отменено', [...FILES.profile, ...FILES.toast])
    // Can a keyboard user reach «Вернуть» before the toast leaves? F6 jumps to the toasts.
    const undo = page.getByRole('button', { name: 'Вернуть' })
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
        await keys.tabTo({ name: /^Вернуть$/ }, '«Вернуть» в тосте')
      } catch {
        // tabTo already recorded the finding.
      }
    }
    ux.complete()
  })
})
