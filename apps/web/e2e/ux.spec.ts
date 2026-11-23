import { expect, test } from '@playwright/test'
import { conflict, mockCreateBooking, succeed } from './fixtures'
import {
  bookingSteps,
  editStep,
  findSmallTapTargets,
  getHorizontalOverflow,
  isInViewport,
  pickFirstFreeSlot,
  primaryAction,
  submitBooking,
} from './helpers'

const fillContacts = async (page: import('@playwright/test').Page) => {
  const { contacts } = bookingSteps(page)
  await contacts.getByLabel('Имя').fill('E2E Тест')
  await contacts.getByLabel('Телефон').fill('+996 555 000 111')
}

test.describe('UX: guidance and feedback', () => {
  test('the main action is never disabled and leads to the first unfinished step', async ({
    page,
  }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)

    await expect(action).toBeEnabled()
    // The action names the next thing to do instead of a bare «Далее».
    await expect(action).toHaveText('Выбрать услугу')
    // Already on that step, the press still answers: its choices shake (it looked like nothing
    // happened). The shake is short, so the moment it starts is caught, not looked for after.
    // It lasts the whole shake: any other animation ending inside the step used to take the mark
    // off at once, so nothing moved («кнопка активна, но ничего не делает»).
    await steps.service.evaluate((step) => {
      const state = window as unknown as { nudgeMs?: number }
      let start = 0
      new MutationObserver(() => {
        if (step.hasAttribute('data-nudge')) start = performance.now()
        else if (start) state.nudgeMs = performance.now() - start
      }).observe(step, { attributes: true, attributeFilter: ['data-nudge'] })
    })
    await action.click()
    await expect(steps.service).toBeInViewport()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { nudgeMs?: number }).nudgeMs ?? 0))
      .toBeGreaterThan(300)

    // On the masters the action does something real: it takes «Любой, кто свободен» and the
    // time comes next («Выбрать мастера» only pointed at the cards already on screen).
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    await expect(action).toHaveText('Любой мастер')
    await action.click()
    await expect(steps.specialist).toContainText('Любой мастер')
    await expect(action).toHaveText(/^Выбрать (время|\d{2}:\d{2})$/)
  })

  test('the main action stays on screen at every step on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones only: desktop uses a sticky summary card')
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    const action = primaryAction(page)

    // The booking screen slides up as a sheet; the bar is on screen once it has settled.
    await expect.poll(() => isInViewport(action)).toBe(true)
    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    expect(await isInViewport(action)).toBe(true)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    expect(await isInViewport(action)).toBe(true)
    await pickFirstFreeSlot(page)
    expect(await isInViewport(action)).toBe(true)
    await page.getByLabel('Телефон').focus()
    expect(await isInViewport(action)).toBe(true)
  })

  test('no validation errors before the first submit attempt', async ({ page }) => {
    await page.goto('/awaisa-studio/book?service=styling')
    const { contacts, specialist } = bookingSteps(page)
    await specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    await pickFirstFreeSlot(page)

    await contacts.getByLabel('Имя').fill('А')
    await contacts.getByLabel('Имя').fill('')
    await contacts.getByLabel('Телефон').fill('12')

    await expect(page.getByText('Укажите имя')).toHaveCount(0)
    await expect(page.getByText('Укажите номер')).toHaveCount(0)
  })

  test('contact errors are inline, human and keep what was typed', async ({ page }) => {
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    await pickFirstFreeSlot(page)
    await steps.contacts.getByLabel('Телефон').fill('555')

    await primaryAction(page).click()

    await expect(steps.contacts.getByText('Укажите имя')).toBeVisible()
    await expect(
      steps.contacts.getByText('Укажите номер, чтобы мы подтвердили запись'),
    ).toBeVisible()
    await expect(steps.contacts.getByLabel('Телефон')).toHaveValue('+996 555')
    await expect(steps.contacts.getByLabel('Имя')).toHaveAttribute('aria-invalid', 'true')
    await expect(steps.contacts).toBeInViewport()
  })

  test('a taken slot (409) explains itself, keeps contacts and asks for a new time', async ({
    page,
  }) => {
    await mockCreateBooking(page, (route) => conflict(route))
    await page.goto('/awaisa-studio/book?service=styling')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Любой мастер/ }).click()
    const time = await pickFirstFreeSlot(page)
    await fillContacts(page)

    const slotsReload = page.waitForRequest(/\/api\/availability/)
    await submitBooking(page)
    await slotsReload

    await expect(
      page.getByText('Это время только что заняли').filter({ visible: true }).first(),
    ).toBeVisible()
    await expect(steps.datetime).toBeInViewport()
    await expect(steps.datetime.getByRole('button', { name: time, pressed: true })).toHaveCount(0)
    await expect(primaryAction(page)).toHaveText(/^Выбрать (время|\d{2}:\d{2})$/)
    // Contacts wait under the time: a new time brings them back as typed.
    await pickFirstFreeSlot(page)
    await expect(steps.contacts.getByLabel('Имя')).toHaveValue('E2E Тест')
  })

  test("a failed request for the services' free times is tried again", async ({ page }) => {
    let failures = 1
    await page.route('**/api/businesses/*/next-free-services**', (route) => {
      if (failures > 0) {
        failures -= 1
        return route.fulfill({ status: 503, json: { message: 'Сервис временно недоступен' } })
      }
      return route.fallback()
    })
    await page.goto('/awaisa-studio/book')

    await expect(
      bookingSteps(page)
        .service.getByText(/^(Сегодня|Завтра) с \d{2}:\d{2}/)
        .first(),
    ).toBeVisible()
    expect(failures).toBe(0)
  })

  test('a full day offers no time left over from the day before', async ({ page }) => {
    // The first day asked for has one free time; every other day is full.
    let firstDate: string | null = null
    await page.route('**/api/availability**', (route) => {
      const date = new URL(route.request().url()).searchParams.get('date')
      firstDate ??= date
      const isFree = date === firstDate
      return route.fulfill({ json: { date, slots: [{ time: '12:00', isAvailable: isFree }] } })
    })
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    const action = primaryAction(page)
    await expect(action).toHaveText('Выбрать 12:00')

    // Another day, full: the bar no longer offers the first day's 12:00.
    const days = page.getByRole('group', { name: 'День' }).getByRole('button', { disabled: false })
    await days.nth(1).click()
    await expect(page.getByText('На этот день всё занято')).toBeVisible()
    await expect(action).toHaveText('Выбрать время')
  })

  test('slot loading failure offers a retry instead of a dead end', async ({ page }) => {
    let failures = 1
    await page.goto('/awaisa-studio/book?service=styling')
    // The quick times ask for slots on open; only the picker's own request fails.
    await page.waitForLoadState('networkidle')
    await page.route('**/api/availability**', (route) => {
      if (failures > 0) {
        failures -= 1
        return route.fulfill({ status: 503, json: { message: 'Сервис временно недоступен' } })
      }
      return route.fallback()
    })
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()

    await expect(page.getByText('Сервис временно недоступен')).toBeVisible()
    await page.getByRole('button', { name: 'Повторить' }).click()
    await expect(
      page.getByRole('group', { name: 'Время' }).or(page.getByText('На этот день всё занято')),
    ).toBeVisible()
  })

  test('finished steps collapse to one line and can be reopened', async ({ page }) => {
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio', { name: /Маникюр/ }).click()

    await expect(steps.service.getByRole('radio')).toHaveCount(0)
    await expect(steps.service).toContainText('Маникюр с покрытием')
    // Reopened from its ticket it is the visit's own list: the service is ticked.
    await editStep(page, 'service')
    const chosen = steps.service.getByRole('checkbox', { name: /Маникюр с покрытием/ })
    await expect(chosen).toBeChecked()
    // Unticking the visit's only service changes nothing and closes the step.
    await chosen.click()
    await expect(steps.service.getByRole('checkbox')).toHaveCount(0)
    await expect(steps.service).toContainText('Маникюр с покрытием')
  })

  test('changing the services keeps a master who does them', async ({ page }) => {
    await page.goto('/awaisa-studio/book?service=haircut-women')
    const steps = bookingSteps(page)
    await steps.specialist.getByRole('radio', { name: /Айгерим/ }).click()
    await pickFirstFreeSlot(page)

    // Another service instead: tick it, untick the first one, «Готово».
    await editStep(page, 'service')
    await steps.service.getByRole('checkbox', { name: /Укладка/ }).click()
    await steps.service.getByRole('checkbox', { name: /Женская стрижка/ }).click()
    await page.getByRole('button', { name: 'Готово' }).filter({ visible: true }).click()

    await expect(steps.service).toContainText('Укладка')
    await expect(steps.service).not.toContainText('Женская стрижка')
    await expect(steps.specialist).toContainText('Айгерим Садыкова')
  })

  test('success screen gives next steps: calendar, route, my bookings, more to look at', async ({
    page,
  }) => {
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    await fillContacts(page)
    await submitBooking(page)

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'В календарь' })).toBeVisible()
    // The sheet, not the place's page dimmed under it (a direct link opens both).
    const screen = page.locator('[data-booking-screen]')
    await expect(screen.getByRole('link', { name: 'Маршрут' })).toBeVisible()
    await expect(screen.getByRole('link', { name: 'Мои записи' })).toBeVisible()

    // «Вам может понравиться» offers the next thing to look at, not the visit just booked.
    const shelf = screen.getByRole('region', { name: 'Вам может понравиться' })
    await shelf.scrollIntoViewIfNeeded()
    const picks = shelf.getByRole('listitem').getByRole('link')
    await expect(picks.first()).toHaveAttribute('href', /\/book\?service=/)
    for (const href of await picks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    )) {
      expect(href).not.toMatch(/\/awaisa-studio\/book\?service=styling$/)
    }
    await expect(screen.getByRole('link', { name: 'Все места и услуги ›' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

test.describe('UX: layout and ergonomics', () => {
  // Phone widths on the phone project (touch, mobile user agent), tablet and laptop widths on
  // desktop: each width is checked once, on the device it belongs to.
  for (const [width, project] of [
    [320, 'mobile'],
    [375, 'mobile'],
    [768, 'desktop'],
    [1024, 'desktop'],
  ] as const) {
    test(`no horizontal scroll at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== project, `${width}px is checked on ${project}`)
      await page.setViewportSize({ width, height: 800 })
      for (const path of [
        '/',
        '/awaisa-studio',
        '/awaisa-studio/services',
        '/awaisa-studio/book',
        '/bookings',
        '/business',
        '/map',
        '/top',
      ]) {
        await page.goto(path)
        // Map tiles keep the network busy; a short wait is enough for the page itself.
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => undefined)
        expect(await getHorizontalOverflow(page), path).toBeLessThanOrEqual(0)
      }
    })
  }

  test('in the Android app the sheet takes the keyboard itself, without a resized WebView', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The on-screen keyboard is a phone matter')
    // The page as the Android app shows it: the app's flag and its message port, kept to read.
    await page.addInitScript(() => {
      const state = window as unknown as { __posted: string[] }
      state.__posted = []
      Object.assign(window, {
        __NATIVE_APP__: { platform: 'android', version: '1.0.0' },
        ReactNativeWebView: { postMessage: (message: string) => state.__posted.push(message) },
      })
      localStorage.setItem(
        'awaisa:contact:v1',
        JSON.stringify({ name: 'E2E Тест', phone: '+996 555 000 111' }),
      )
    })
    const posted = () =>
      page.evaluate(() => (window as unknown as { __posted: string[] }).__posted.join('\n'))
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    // The sheet asks the app to leave the WebView whole.
    await expect.poll(posted).toContain('"mode":"overlay"')

    const toggle = page.getByRole('switch', { name: 'Записываю другого человека' })
    await toggle.waitFor()
    await toggle.evaluate((element) => {
      element.scrollIntoView({ block: 'end' })
      document.querySelector('[data-booking-screen]')?.scrollBy({ top: -90 })
    })
    await toggle.click()
    const name = bookingSteps(page).contacts.getByRole('textbox', { name: 'Имя' })
    await expect(name).toBeFocused()

    // The app reports its keyboard: the sheet makes room and sets the field above it.
    const keyboardTop = await page.evaluate(() => {
      const height = 300
      window.dispatchEvent(
        new CustomEvent('awaisa:native', { detail: { type: 'keyboard', height } }),
      )
      return window.innerHeight - height
    })
    const sheet = page.locator('[data-booking-screen]')
    await expect(sheet).toHaveAttribute('data-keyboard', '')
    await expect
      .poll(async () => {
        const box = await name.boundingBox()
        return box ? box.y + box.height <= keyboardTop : false
      })
      .toBe(true)

    // A keyboard that went with the app to the background says nothing: once no field has the
    // caret, the sheet gives its room back.
    await name.blur()
    await expect(sheet).not.toHaveAttribute('data-keyboard')

    // Closed, the sheet gives the app its usual resizing back.
    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await expect.poll(posted).toContain('"mode":"resize"')
  })

  test('a field the form focuses is set above the phone keyboard', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The on-screen keyboard is a phone matter')
    // A saved contact offers «Записываю другого человека», which moves the caret to «Имя».
    await page.addInitScript(() =>
      localStorage.setItem(
        'awaisa:contact:v1',
        JSON.stringify({ name: 'E2E Тест', phone: '+996 555 000 111' }),
      ),
    )
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    const toggle = page.getByRole('switch', { name: 'Записываю другого человека' })
    await toggle.waitFor()

    // The keyboard slides over the fixed sheet and only shrinks the visual viewport: play that
    // with the switch low on the screen, where «Имя» above it ends up under the keyboard.
    const result = await toggle.evaluate(async (switchElement) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      const sheet = document.querySelector<HTMLElement>('[data-booking-screen]')
      const viewport = window.visualViewport
      if (!sheet || !viewport) return null
      switchElement.scrollIntoView({ block: 'end' })
      sheet.scrollBy({ top: -90 })
      await wait(300)
      const keyboardTop = window.innerHeight - 300
      Object.defineProperty(viewport, 'height', { configurable: true, get: () => keyboardTop })
      if (switchElement instanceof HTMLElement) switchElement.click()
      await wait(600)
      viewport.dispatchEvent(new Event('resize'))
      await wait(500)
      const input = document.querySelector<HTMLInputElement>(
        '#step-contacts input[autocomplete="name"]',
      )
      const box = input?.getBoundingClientRect()
      return {
        isFocused: document.activeElement === input,
        bottom: box?.bottom ?? Number.POSITIVE_INFINITY,
        keyboardTop,
      }
    })

    expect(result?.isFocused).toBe(true)
    expect(result?.bottom).toBeLessThanOrEqual(result?.keyboardTop ?? 0)
  })

  test('a field the form focuses stays clear of the sheet bars when the keyboard shrinks the page', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'The on-screen keyboard is a phone matter')
    // Samsung Internet and others shrink the page itself for the keyboard: the field once went
    // under the sheet's top bar, measured from the window's top instead of the sheet's.
    await page.addInitScript(() =>
      localStorage.setItem(
        'awaisa:contact:v1',
        JSON.stringify({ name: 'E2E Тест', phone: '+996 555 000 111' }),
      ),
    )
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await pickFirstFreeSlot(page)
    const toggle = page.getByRole('switch', { name: 'Записываю другого человека' })
    await toggle.waitFor()
    await toggle.evaluate((switchElement) => {
      switchElement.scrollIntoView({ block: 'end' })
      document.querySelector('[data-booking-screen]')?.scrollBy({ top: -90 })
    })
    await toggle.click()
    const size = page.viewportSize()
    await page.setViewportSize({ width: size?.width ?? 412, height: (size?.height ?? 839) - 300 })

    const name = bookingSteps(page).contacts.getByRole('textbox', { name: 'Имя' })
    await expect(name).toBeFocused()
    await expect
      .poll(async () => {
        const box = await name.boundingBox()
        const topBar = await page.locator('[data-booking-top-bar]').boundingBox()
        const bar = await page.locator('[data-booking-bar] > *').first().boundingBox()
        if (!box || !topBar || !bar) return false
        return box.y >= topBar.y + topBar.height && box.y + box.height <= bar.y
      })
      .toBe(true)
  })

  test('picking in the booking sheet moves nothing decorative', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones only: from 768px the booking is a side panel')
    await page.goto('/awaisa-studio/book')
    const steps = bookingSteps(page)
    await steps.service.getByRole('radio', { name: /Укладка/ }).waitFor()

    // The page under the sheet stays as it is: it used to shrink back, a layer the size of the
    // page that cost frames on phones («убери всю лишнюю анимацию»).
    await page.waitForTimeout(600)
    expect(await page.locator('html').getAttribute('data-booking-sheet')).toBeNull()

    // The step segments say how far along, as a progress bar.
    const progress = page.getByRole('progressbar', { name: 'Шаги записи' })
    await expect(progress).toHaveAttribute('aria-valuenow', '0')

    await steps.service.getByRole('radio', { name: /Укладка/ }).click()
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    // No copy of the card flies, no step or stack card slides in, the total is plain text: the
    // only motion left in the sheet answers a finger (a drag, the fan) or a wait (the spinner).
    await expect(page.locator('body > [aria-hidden="true"][style*="z-index: 61"]')).toHaveCount(0)
    const moving = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target
          // Scroll-driven ones (the top bar's material) move with the finger, not by themselves.
          const isTimed = animation.timeline instanceof DocumentTimeline
          return isTimed && target instanceof Element && target.closest('[data-booking-screen]')
        })
        .map((animation) => (animation as CSSAnimation).animationName ?? 'transition'),
    )
    expect(moving.filter((name) => name !== 'transition')).toEqual([])
    await expect(page.locator('[data-booking-bar] [class*="barPrice"]')).toHaveText(
      /^[\d\s]+\sсом$/,
    )
  })

  test('booking controls are at least 44×44 on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch targets matter on touch screens')
    await page.goto('/awaisa-studio/book?service=styling')
    await bookingSteps(page)
      .specialist.getByRole('radio', { name: /Любой мастер/ })
      .click()
    await page
      .getByRole('group', { name: 'Время' })
      .or(page.getByText('На этот день всё занято'))
      .waitFor()

    expect(await findSmallTapTargets(page)).toEqual([])
  })

  test('the whole booking can be done with a keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard flow is a desktop concern')
    await mockCreateBooking(page, succeed)
    await page.goto('/awaisa-studio/book')

    await page.getByRole('radio', { name: /Женская стрижка/ }).focus()
    await page.keyboard.press('Space')
    await expect(bookingSteps(page).service).toContainText('Женская стрижка')

    await page.getByRole('radio', { name: /Любой мастер/ }).focus()
    await page.keyboard.press('Space')
    const freeSlot = page
      .getByRole('group', { name: 'Время' })
      .getByRole('button', { disabled: false })
      .first()
    await freeSlot.or(page.getByText('На этот день всё занято')).waitFor()
    test.skip((await freeSlot.count()) === 0, 'No free slots today')
    await freeSlot.focus()
    await page.keyboard.press('Enter')

    await page.getByLabel('Имя').focus()
    await page.keyboard.type('E2E Тест')
    await page.keyboard.press('Tab')
    await page.keyboard.type('+996555000111')
    // Everything filled: one press books.
    await expect(primaryAction(page)).toHaveText('Записаться')
    await primaryAction(page).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
  })

  // Next keeps visited routes in the DOM (hidden): the booking sheet's scroll lock must not
  // outlive it, or every page after it stops scrolling.
  test('closing the booking screen gives the page its scroll back', async ({ page }) => {
    await page.goto('/awaisa-studio')
    await page.locator('a[href*="/book?service="]').first().click()
    await page.waitForURL(/\/book\?/)
    // Opened over the page it was tapped on: the place's page stays under the panel.
    await expect(page.locator('[data-booking-screen]')).toBeVisible()
    await expect(page.locator('#masters')).toBeAttached()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.overflow))
      .toBe('hidden')
    await page.getByRole('link', { name: 'Закрыть запись' }).click()
    await page.waitForURL(/awaisa-studio$/)
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow))
      .not.toBe('hidden')
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })
})
