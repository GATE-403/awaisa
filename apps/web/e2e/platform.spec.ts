import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { bookingSteps, pickFirstFreeSlot, submitBooking, waitForToastsToLeave } from './helpers'

// 16×10 px PNG; the API re-encodes it as WebP.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAFUlEQVQYlWNgKHxMGmIY1fB4KIYSAN5g1IFgp8jzAAAAAElFTkSuQmCC'

// Settings open from the cabinet's «Настройки»: a sidebar beside the section from 1024px, the
// list alone on phones; either way the row is in the «Настройки» navigation.
const openSettings = async (page: Page, name: string) => {
  await page
    .getByRole('navigation', { name: 'Разделы кабинета' })
    .getByRole('link', { name: 'Настройки' })
    .click()
  await page.getByRole('navigation', { name: 'Настройки' }).getByRole('link', { name }).click()
}

test.describe('Platform: a new business goes live', () => {
  test('owner registers, adds a service and a master; a client books; owner sees it', async ({
    page,
    browser,
  }) => {
    // The longest journey in the suite: registration, setup, a client booking, the schedule.
    test.setTimeout(90_000)
    const suffix = Math.random().toString(36).slice(2, 7)
    const name = `E2E Барбер ${suffix}`
    const slug = `e2e-barber-${suffix}`
    await signInViaApi(page, randomClientPhone(), 'E2E Владелец')

    await page.goto('/business')
    await page.getByRole('link', { name: 'Создать страницу' }).click()
    await page.getByLabel('Название').fill(name)
    await expect(page.getByLabel('Ссылка на страницу')).toHaveValue(slug)
    await expect(page.getByText(`Свободна: awaisa.kg/${slug}`)).toBeVisible()
    await page.getByRole('button', { name: 'Далее' }).click()

    // Kind: a barbershop gets a starter menu; this test builds its own, so it picks «Другое».
    await page.getByRole('radio', { name: 'Барбершопы' }).click()
    await expect(page.getByRole('checkbox', { name: 'Мужская стрижка' })).toBeChecked()
    await page.getByRole('radio', { name: 'Другое' }).click()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button', { name: 'Далее' }).click()
    await page.getByRole('button', { name: 'Создать страницу' }).click()

    await expect(page).toHaveURL(new RegExp(`/manage/${slug}\\?tab=services`))
    await expect(page.getByRole('heading', { name: 'Запуск записи' })).toBeVisible()

    await page.getByRole('button', { name: 'Добавить услугу' }).first().click()
    const serviceDialog = page.getByRole('dialog')
    await serviceDialog.getByLabel('Название').fill('Стрижка')
    await serviceDialog.getByLabel('Цена, сом').fill('700')
    await serviceDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: /Стрижка/ })).toBeVisible()

    // Services, masters and hours live on «Страница»: its «Мастера» tab.
    await page.getByRole('tab', { name: /Мастера/ }).click()
    await page.getByRole('button', { name: 'Добавить мастера' }).first().click()
    const masterDialog = page.getByRole('dialog')
    await masterDialog.getByLabel('Имя').fill('Азамат')
    await expect(masterDialog.getByRole('checkbox', { name: 'Стрижка' })).toBeChecked()
    await masterDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('heading', { name: 'Запуск записи' })).toHaveCount(0)

    // A second address: the booking page then asks where.
    await openSettings(page, 'Филиалы')
    await expect(page.getByRole('button', { name: /^Основной/ })).toBeVisible()
    await page.getByRole('button', { name: 'Добавить филиал' }).click()
    const branchDialog = page.getByRole('dialog', { name: 'Новый филиал' })
    await branchDialog.getByLabel('Название').fill('Джал')
    await branchDialog.getByLabel('Адрес').fill('мкр. Джал, 15')
    await branchDialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: /Джал.*Нет метки/ })).toBeVisible()

    // A cover photo: uploaded, compressed by the API and shown on the catalog card.
    // The public page is its own tab: the cover is changed right on its head.
    await page.getByRole('link', { name: 'Страница', exact: true }).click()
    await page.getByLabel('Файл обложки').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(TINY_PNG, 'base64'),
    })
    await expect(page.getByRole('img', { name: 'Обложка' })).toBeVisible()

    const client = await browser.newContext()
    const clientPage = await client.newPage()
    await clientPage.goto('/')
    const search = clientPage.getByRole('searchbox', { name: 'Поиск салонов и мастеров' })
    // By the unique part of the name: other specs of the run leave many «E2E …» places, and
    // a search for «E2E Барбер …» would list them all with this one somewhere down the list.
    await search.fill(suffix)
    await search.press('Enter')
    await clientPage.getByRole('link', { name: new RegExp(name) }).click()
    await expect(clientPage).toHaveURL(new RegExp(`/${slug}$`))
    // The head's «Записаться» opens the booking form itself, on every screen size.
    await clientPage.locator('[data-place-book]').click()
    await expect(clientPage).toHaveURL(new RegExp(`/${slug}/book$`))

    await expect(clientPage.locator('#step-branch')).toBeVisible()
    const steps = bookingSteps(clientPage)
    await steps.service.getByRole('radio', { name: /^Стрижка/ }).click()
    await expect(steps.service).toContainText('Стрижка')
    // The only master is chosen for the client: the step is already filled in.
    await expect(steps.specialist).toContainText('Азамат')
    const time = await pickFirstFreeSlot(clientPage)
    const clientPhone = randomClientPhone()
    await steps.contacts.getByLabel('Имя').fill('E2E Клиент')
    await steps.contacts.getByLabel('Телефон').fill(clientPhone)
    await submitBooking(clientPage)
    await expect(clientPage.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(clientPage.getByRole('article', { name: /^Запись / })).toContainText(name)
    const booked = await clientPage.evaluate(() => {
      const raw = window.localStorage.getItem('awaisa:bookings:v2')
      return raw ? (JSON.parse(raw) as { snapshot: { date: string } }[])[0]?.snapshot.date : null
    })
    await client.close()

    await page.getByRole('link', { name: 'Расписание' }).click()
    const day = page.locator(`[data-day="${booked}"]`)
    await day.waitFor()
    await waitForToastsToLeave(page)
    await day.click()
    const phonePattern = clientPhone.replace('+', '\\+')
    await expect(
      page.getByRole('button', { name: new RegExp(`^${time}.*${phonePattern}`) }),
    ).toBeVisible()

    // A walk-in on the next day: late in the afternoon today has no room left to drag it an hour.
    const nextDay = new Date(`${booked}T00:00:00Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    await waitForToastsToLeave(page)
    await page.locator(`[data-day="${nextDay.toISOString().slice(0, 10)}"]`).click()
    // A walk-in: the owner taps an empty slot and books the client in.
    // Below the master's last booking, wherever the day has it: a fixed spot meets the client's
    // booking after noon. The day scrolls in its own box, so bring that spot into view first.
    const column = page.getByRole('button', { name: 'Новая запись к мастеру Азамат' })
    // Bring the free spot to the middle of the day's own box (the page into view first), then click
    // that point of the screen: clicking the tall column itself scrolled it to its top, where the
    // sticky masters' row covered the spot.
    // A new day remounts the lanes (they slide in): wait for the settled column before measuring.
    let point = { x: 0, y: 0 }
    await expect(async () => {
      await column.scrollIntoViewIfNeeded({ timeout: 2000 })
      point = await column.evaluate(async (element) => {
        const box = element.getBoundingClientRect()
        const bottoms = [
          ...(element.parentElement?.querySelectorAll('[class*="booking"]') ?? []),
        ].map((block) => block.getBoundingClientRect().bottom - box.top)
        const y = Math.min(box.height - 30, Math.max(60, ...bottoms) + 40)
        const scroller = element.closest<HTMLElement>('[class*="scroller"]')
        if (scroller) {
          const view = scroller.getBoundingClientRect()
          scroller.scrollTop += box.top + y - view.top - scroller.clientHeight / 2
        }
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
        const after = element.getBoundingClientRect()
        return { x: after.left + 24, y: after.top + y }
      })
    }).toPass({ timeout: 15000 })
    await page.mouse.click(point.x, point.y)
    // The sheet, not the «Новая запись» toast for the client's booking (a dialog of that name too,
    // which may come down at any moment while the cabinet polls for new bookings).
    const sheet = page
      .getByRole('dialog', { name: 'Новая запись' })
      .and(page.locator(':not([data-type])'))
    await expect(sheet.getByRole('combobox', { name: 'Время' })).toBeVisible()
    await sheet.getByLabel('Имя').fill('E2E Гость')
    await sheet.getByLabel('Телефон').fill(randomClientPhone())
    await sheet.getByRole('button', { name: 'Добавить' }).click()
    await expect(sheet).toHaveCount(0)
    const walkIn = page.getByRole('button', { name: /E2E Гость/ })
    await expect(walkIn).toBeVisible()

    // Direct manipulation on desktop: drag the booking an hour later, then undo from the toast.
    if (!test.info().project.name.includes('mobile')) {
      // The walk-in lands on the next free time, low in the day after noon: centre it first.
      await walkIn.evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' }),
      )
      const box = await walkIn.boundingBox()
      // An hour later, or an hour earlier when the walk-in sits at the end of the day (the day
      // shown is tomorrow, so earlier is never in the past). 1.6 px a minute: an hour is 96px.
      const startHour = Number(((await walkIn.getAttribute('aria-label')) ?? '').slice(0, 2))
      const shift = startHour >= 18 ? -96 : 96
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + 10)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y + 10 + shift / 2, { steps: 4 })
        await page.mouse.move(box.x + box.width / 2, box.y + 10 + shift, { steps: 4 })
        await page.mouse.up()
        await expect(page.getByText(/Перенесено на/)).toBeVisible()
        await page.getByRole('button', { name: 'Вернуть' }).click()
        await expect(page.getByText('Запись на прежнем месте')).toBeVisible()
      }
    }
  })

  test('reserved and taken page addresses are refused before submitting', async ({ page }) => {
    await signInViaApi(page, randomClientPhone(), 'E2E Владелец')
    await page.goto('/business/new')

    await page.getByLabel('Название').fill('Login')
    await expect(page.getByText('Этот адрес занят')).toBeVisible()
    await page.getByLabel('Ссылка на страницу').fill('awaisa-studio')
    await expect(page.getByText('Этот адрес занят')).toBeVisible()
  })

  test('closed days cannot be picked for booking', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const closedDays = page
      .getByRole('group', { name: 'День' })
      .getByRole('button', { name: /выходной/ })
    for (const day of await closedDays.all()) await expect(day).toBeDisabled()
  })
})
