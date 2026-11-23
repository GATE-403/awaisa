import { expect } from '@playwright/test'
import { mockCreateBooking, succeed } from '../../../apps/web/e2e/fixtures'
import { bookingSteps, pickFirstFreeSlot, primaryAction } from '../../../apps/web/e2e/helpers'
import { createPastVisit, withDb } from '../../../apps/web/e2e/visits'
import {
  bookAs,
  dayKey,
  getBusiness,
  randomPhone,
  reviewLink,
  SLUG,
  signedInRequest,
  TEST_CODE,
  UX_ADMIN_PHONE,
  withLock,
} from '../lib/data'
import type { UxContext } from '../lib/ux'
import type { FlowId } from '../personas'

// Each flow is what a person does to reach one goal, written once. `ux.step` marks a screen
// worth judging — the persona's checks run there; `ux.tap/fill/press` are the person's actions,
// counted against the effort budget. Steps name the files to look at when something fails.

type Flow = {
  id: FlowId
  title: string
  goal: string
  run: (ux: UxContext) => Promise<void>
}

const WEB = 'apps/web/src'
const FILES = {
  catalog: [`${WEB}/views/catalog/ui/CatalogResults`, `${WEB}/entities/offer`],
  header: [`${WEB}/widgets/Header`, `${WEB}/widgets/HeaderSearch/HeaderSearch.tsx`],
  tabBar: [`${WEB}/widgets/TabBar`],
  place: [`${WEB}/views/business/ui/Place`, `${WEB}/widgets/BusinessBar`],
  bookingSheet: [`${WEB}/views/booking`, `${WEB}/views/booking/ui/BookingTopBar`],
  service: [`${WEB}/views/booking/ui/ServicePicker`, `${WEB}/views/booking/ui/BookingStep`],
  master: [`${WEB}/views/booking/ui/MasterPicker`],
  time: [`${WEB}/entities/booking/ui/DateTimePicker`],
  contacts: [
    `${WEB}/views/booking/ui/BookingStep`,
    `packages/ui/src/components/Field`,
    `packages/ui/src/components/Input`,
  ],
  success: [`${WEB}/views/booking/ui/BookingSuccess`, `${WEB}/entities/booking/ui/Ticket`],
  login: [`${WEB}/views/auth/LoginPage.tsx`, `packages/ui/src/components/OtpField`],
  profile: [`${WEB}/views/bookings/ui/UpcomingBooking`, `${WEB}/views/bookings/ui/AccountCard`],
  ticket: [`${WEB}/features/ticketView/ui/TicketViewer.tsx`, `${WEB}/entities/booking/ui/Ticket`],
  reschedule: [`${WEB}/features/rescheduleBooking/ui/RescheduleSheet`],
  toast: ['packages/ui/src/components/Toast/Toast.tsx'],
  pay: [`${WEB}/views/pay/PayPage.tsx`],
  waitlist: [`${WEB}/features/waitlist/ui/WaitlistJoin.tsx`, `${WEB}/shared/ui/Sheet`],
  review: [`${WEB}/views/review/ReviewPage.tsx`, `${WEB}/features/rateVisit/ui/StarRating`],
  register: [`${WEB}/views/forBusiness/CreateBusinessPage.tsx`],
  cabinet: [
    `${WEB}/views/manage`,
    `${WEB}/views/manage/ui/SetupProgress`,
    `${WEB}/views/manage/ui/CabinetBar`,
  ],
}

const chooseServiceAndMaster = async (ux: UxContext) => {
  const steps = bookingSteps(ux.page)
  await ux.tap(steps.service.getByRole('radio').first())
  const anyMaster = steps.specialist.getByRole('radio', { name: /Любой мастер/ })
  await anyMaster
    .or(steps.datetime.getByRole('group', { name: 'День' }))
    .first()
    .waitFor()
  if (await anyMaster.isVisible()) await ux.tap(anyMaster)
  return steps
}

const flows: Flow[] = [
  {
    id: 'catalog',
    title: 'Каталог и поиск',
    goal: 'Найти «стрижку» и открыть подходящую услугу',
    run: async (ux) => {
      const { page } = ux
      await ux.goto('/')
      await page.locator('main [data-card]').first().waitFor()
      await ux.step('Каталог: первый экран', [...FILES.catalog, ...FILES.header])

      const search = page.getByRole('searchbox', { name: 'Поиск салонов и мастеров' })
      await ux.tap(search)
      await ux.fill(search, 'стрижка')
      await page
        .getByRole('region', { name: 'Подсказки' })
        .or(page.locator('section[aria-label="Подсказки"]'))
        .first()
        .waitFor()
        .catch(() => {})
      await ux.step('Подсказки поиска', FILES.header)

      await ux.press('Enter')
      await page.waitForURL(/[?&]q=/)
      const card = page.locator('main [data-card]').first()
      await card.waitFor()
      await ux.step('Результаты поиска', FILES.catalog)

      await ux.tap(card.getByRole('link').first())
      await page.waitForURL((url) => !url.searchParams.has('q') || url.pathname !== '/')
      await ux.step('Открыта услуга или место', [...FILES.bookingSheet, ...FILES.place])
      ux.complete()
    },
  },
  {
    id: 'business',
    title: 'Страница бизнеса',
    goal: 'Понять цены, адрес и часы и открыть запись',
    run: async (ux) => {
      const { page } = ux
      await ux.goto(`/${SLUG}`)
      await page.locator('[data-place-book]').first().waitFor()
      await ux.step('Шапка места', FILES.place)

      const services = page.getByRole('heading', { name: /Услуги и цены/ }).first()
      await services.scrollIntoViewIfNeeded()
      await ux.step('Услуги и цены', FILES.place)

      const contacts = page.getByRole('heading', { name: /Контакты|Как добраться|Адрес/ }).first()
      if (await contacts.count()) await contacts.scrollIntoViewIfNeeded()
      await ux.step('Контакты и часы', FILES.place)

      await page.evaluate(() => window.scrollTo(0, 0))
      await ux.tap(page.locator('[data-place-book]').first())
      await page.waitForURL(/\/book/)
      await bookingSteps(page).service.waitFor()
      await ux.step('Запись открыта', FILES.bookingSheet)
      ux.complete()
    },
  },
  {
    id: 'booking',
    title: 'Запись к мастеру',
    goal: 'Записаться на услугу и увидеть «Вы записаны»',
    run: async (ux) => {
      const { page } = ux
      // The booking itself is answered by a mock: parallel runs never fight for one time.
      await mockCreateBooking(page, succeed)
      await ux.goto(`/${SLUG}`)
      await page.locator('[data-place-book]').first().waitFor()
      await ux.tap(page.locator('[data-place-book]').first())
      await page.waitForURL(/\/book/)
      const steps = bookingSteps(page)
      await steps.service.waitFor()
      await ux.step('Шаг 1: что делаем', [...FILES.bookingSheet, ...FILES.service])

      await chooseServiceAndMaster(ux)
      await steps.datetime.waitFor()
      await ux.step('Шаг 3: когда удобно', FILES.time)

      ux.countAction()
      await pickFirstFreeSlot(page)
      const name = steps.contacts.getByLabel('Имя')
      await name.waitFor()
      await ux.step('Шаг 4: контакты', FILES.contacts)

      await ux.fill(name, 'E2E UX Запись')
      const phone = steps.contacts.getByLabel('Телефон')
      // A mistake first, as people make them: too few digits.
      await ux.uncounted(async () => {
        await ux.fill(phone, '555 12')
        // With a short number the action names the step it waits for («Ввести контакты»).
        await primaryAction(page).first().click()
      })
      await ux.expectFieldError(phone, /(цифр|номер|телефон)/i)
      await ux.step('Ошибка в номере', FILES.contacts)

      await ux.fill(phone, '555 000 111')
      await ux.tap(
        page.getByRole('button', { name: 'Записаться' }).filter({ visible: true }).first(),
      )
      await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
      await ux.step('Вы записаны', FILES.success)
      ux.complete()
    },
  },
  {
    id: 'login',
    title: 'Вход по SMS',
    goal: 'Войти по номеру и коду и попасть в профиль',
    run: async (ux) => {
      const { page } = ux
      await ux.goto('/login?next=/bookings')
      const phone = page.getByLabel('Номер телефона')
      await phone.waitFor()
      await ux.step('Номер телефона', FILES.login)

      await ux.uncounted(async () => {
        await ux.fill(phone, '555 12')
        await page.getByRole('button', { name: 'Получить код' }).click()
      })
      await ux.expectFieldError(phone, /Номер неполный/)
      await ux.step('Ошибка: номер неполный', FILES.login)

      await ux.fill(phone, randomPhone().replace('+996', ''))
      await ux.tap(page.getByRole('button', { name: 'Получить код' }))
      const code = page.getByLabel('Код подтверждения')
      await code.waitFor()
      await ux.step('Код из SMS', FILES.login)

      await ux.uncounted(() => ux.fill(code, '000000'))
      await ux.expectFieldError(code, /Неверный код/)
      await ux.step('Ошибка: неверный код', FILES.login)

      await code.fill('')
      await ux.fill(code, TEST_CODE)
      const name = page.getByLabel('Имя')
      await name.waitFor()
      await ux.step('Как вас зовут', FILES.login)

      await ux.fill(name, 'E2E UX Вход')
      await ux.tap(page.getByRole('button', { name: 'Готово' }))
      await expect(page.getByRole('region', { name: 'Профиль' })).toBeVisible()
      await ux.step('Профиль', FILES.profile)
      ux.complete()
    },
  },
  {
    id: 'profile',
    title: 'Талон, перенос и отмена',
    goal: 'Открыть талон, перенести запись и отменить её',
    run: async (ux) => {
      const { page } = ux
      const phone = randomPhone()
      const account = await signedInRequest(phone, 'E2E UX Профиль')
      await bookAs(account, 'E2E UX Профиль', phone, 0)
      await page.context().addCookies(await account.storageState().then((state) => state.cookies))
      await account.dispose()

      await ux.goto('/bookings')
      const ticket = page.getByRole('article', { name: /^Запись / }).first()
      await ticket.waitFor()
      await ux.step('Профиль: предстоящие', FILES.profile)

      await ux.tap(ticket.getByRole('button', { name: 'Показать талон' }))
      const sheet = page.getByRole('dialog', { name: 'Талон' })
      await sheet.waitFor()
      await ux.step('Талон', FILES.ticket)
      await ux.tap(sheet.getByRole('button', { name: 'Закрыть' }))
      await expect(sheet).toBeHidden()

      await ux.tap(page.getByRole('button', { name: 'Перенести', exact: true }).first())
      const move = page.getByRole('dialog', { name: 'Перенести запись' })
      await move.waitFor()
      const time = move.getByRole('group', { name: 'Время' }).getByRole('button').first()
      await time.waitFor()
      await ux.step('Перенос: выбор времени', FILES.reschedule)
      const newTime = ((await time.textContent()) ?? '').trim()
      await ux.tap(time)
      await ux.tap(move.getByRole('button', { name: `Перенести на ${newTime}` }))
      await expect(page.getByText(/Перенесено:/)).toBeVisible()
      await ux.step('Перенесено', [...FILES.profile, ...FILES.toast])

      await ux.tap(ticket.getByRole('button', { name: 'Ещё' }))
      await ux.tap(page.getByRole('menuitem', { name: 'Отменить запись' }))
      await expect(ticket.getByText('Отменена')).toBeVisible()
      await ux.step('Отменено, тост «Вернуть»', [...FILES.profile, ...FILES.toast])
      // Watch the undo toast for as long as a slow reader would need it.
      await page.waitForTimeout(6000)
      ux.complete()
    },
  },
  {
    id: 'prepayment',
    title: 'Предоплата',
    goal: 'Записаться на услугу с предоплатой и оплатить на тестовой кассе',
    run: (ux) =>
      withLock('deposit', async () => {
        const { page } = ux
        const DEPOSIT = 500
        const admin = await signedInRequest(UX_ADMIN_PHONE, 'E2E UX Администратор')
        const business = await getBusiness()
        const master = business.catalog.specialists.at(-1)
        if (!master) throw new Error('No masters')
        const managed = await (await admin.get(`/api/manage/${SLUG}`)).json()
        const service = managed.catalog.services.find(
          (item: { id: string }) => item.id === master.serviceIds[0],
        )
        const saveDeposit = (deposit: number | null) =>
          admin.put(`/api/manage/${SLUG}/services/${service.id}`, {
            data: {
              categoryId: service.categoryId,
              name: service.name,
              description: service.description,
              durationMinutes: service.durationMinutes,
              price: service.price,
              isPopular: service.isPopular,
              isActive: service.isActive ?? true,
              deposit,
            },
          })
        try {
          expect((await saveDeposit(DEPOSIT)).ok()).toBe(true)
          await ux.goto(`/${SLUG}/book?service=${service.id}&specialist=${master.id}`)
          const steps = bookingSteps(page)
          await steps.datetime.getByRole('group', { name: 'День' }).waitFor()
          await ux.step('Форма: услуга с предоплатой', [...FILES.bookingSheet, ...FILES.time])

          ux.countAction()
          await pickFirstFreeSlot(page)
          await steps.contacts.getByLabel('Имя').waitFor()
          await ux.step('Контакты: видно ли сумму предоплаты', FILES.contacts)
          await ux.fill(steps.contacts.getByLabel('Имя'), 'E2E UX Предоплата')
          await ux.fill(steps.contacts.getByLabel('Телефон'), randomPhone().replace('+996', ''))
          await ux.tap(
            page.getByRole('button', { name: 'Записаться' }).filter({ visible: true }).first(),
          )

          await expect(page).toHaveURL(/\/pay\/[0-9a-f-]+\?s=/)
          await expect(page.getByText('Тестовый режим')).toBeVisible({ timeout: 30_000 })
          await ux.step('Касса (тестовый режим)', FILES.pay)
          await ux.tap(page.getByRole('button', { name: `Оплатить ${DEPOSIT} сом` }))
          await expect(page).toHaveURL(/\/bookings/)
          await expect(page.getByText('Предоплата внесена')).toBeVisible()
          await ux.step('Оплачено', FILES.profile)
          ux.complete()
        } finally {
          await saveDeposit(null)
          await admin.dispose()
        }
      }),
  },
  {
    id: 'waitlist',
    title: 'Лист ожидания',
    goal: 'На занятый день встать в лист ожидания',
    run: async (ux) => {
      const { page } = ux
      const business = await getBusiness()
      const master = business.catalog.specialists[0]
      const date = dayKey(3)
      // A full day without touching the schedule: every free time answers «занято».
      await page.route('**/api/availability?**', async (route) => {
        const response = await route.fetch()
        const json = await response.json()
        json.slots = (json.slots ?? []).map((slot: object) => ({ ...slot, isAvailable: false }))
        await route.fulfill({ response, json })
      })
      await page.route('**/api/waitlist', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback()
        const body = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          json: {
            id: '00000000-0000-4000-8000-0000000000aa',
            token: 'ux-test-token',
            status: 'waiting',
            date: body.date,
            notifiedTime: null,
            service: { id: body.serviceId, name: 'Услуга' },
            specialist: null,
            business: { name: 'Awaisa Studio', slug: SLUG },
          },
        })
      })

      await ux.goto(
        `/${SLUG}/book?service=${master.serviceIds[0]}&specialist=${master.id}&date=${date}`,
      )
      const join = page.getByRole('button', { name: 'Сообщить, когда освободится' })
      await join.waitFor()
      await ux.step('День занят', [...FILES.time, ...FILES.waitlist])

      await ux.tap(join)
      const sheet = page.getByRole('dialog', { name: 'Лист ожидания' })
      await sheet.waitFor()
      await ux.step('Лист ожидания: форма', FILES.waitlist)

      await ux.fill(sheet.getByLabel('Имя'), 'E2E UX Ожидание')
      const phone = sheet.getByLabel('Телефон')
      await ux.uncounted(async () => {
        await ux.fill(phone, '555 1')
        await sheet.getByRole('button', { name: 'Готово' }).click()
      })
      await ux.expectFieldError(phone, /(цифр|номер|телефон)/i)
      await ux.step('Ошибка в номере', FILES.waitlist)

      await ux.fill(phone, '555 000 222')
      await ux.tap(sheet.getByRole('button', { name: 'Готово' }))
      await expect(page.getByText('Сообщим, если освободится')).toBeVisible()
      await ux.step('В листе ожидания', FILES.waitlist)
      ux.complete()
    },
  },
  {
    id: 'review',
    title: 'Отзыв по ссылке из SMS',
    goal: 'Поставить оценку и оставить отзыв',
    run: (ux) =>
      withLock('rating', async () => {
        const { page } = ux
        const { booking, specialist } = await createPastVisit('E2E UX Отзыв')
        const saved = await withDb(async (client) => {
          const { rows } = await client.query(
            'SELECT "rating" FROM "specialists" WHERE "id" = $1',
            [specialist.id],
          )
          return rows[0]?.rating ?? null
        })
        try {
          await ux.goto(reviewLink(booking.id))
          const send = page.getByRole('button', { name: 'Отправить отзыв' })
          await send.waitFor()
          await ux.step('Как прошёл визит', FILES.review)

          await ux.uncounted(() => ux.tap(send))
          await ux.expectFieldError(page.getByRole('radiogroup').first(), /Поставьте оценку/)
          await ux.step('Ошибка: нет оценки', FILES.review)

          await ux.check(page.getByLabel(/^5 из 5/))
          await ux.fill(page.getByLabel(/Расскажите подробнее/), 'E2E UX: всё понравилось')
          await ux.tap(send)
          await expect(page.getByText(/Спасибо/).first()).toBeVisible()
          await ux.step('Спасибо за отзыв', FILES.review)
          ux.complete()
        } finally {
          await withDb((client) =>
            client.query('UPDATE "specialists" SET "rating" = $2 WHERE "id" = $1', [
              specialist.id,
              saved,
            ]),
          )
        }
      }),
  },
  {
    id: 'owner',
    title: 'Регистрация бизнеса и кабинет',
    goal: 'Завести страницу барбершопа, добавить мастера, открыть расписание',
    run: async (ux) => {
      const { page } = ux
      const account = await signedInRequest(randomPhone(), 'E2E UX Владелец')
      await page.context().addCookies(await account.storageState().then((state) => state.cookies))
      await account.dispose()
      const suffix = Math.random().toString(36).slice(2, 7)

      await ux.goto('/business')
      await ux.step('Лендинг для бизнеса', [`${WEB}/views/forBusiness/ForBusinessPage.tsx`])
      await ux.tap(page.getByRole('link', { name: 'Создать страницу' }).first())
      const title = page.getByLabel('Название')
      await title.waitFor()
      await ux.step('Шаг 1: название и адрес', FILES.register)

      await ux.uncounted(() => ux.fill(title, 'Login'))
      // The address is checked against the server after a pause: wait for the answer.
      await expect(page.getByText('Этот адрес занят')).toBeVisible()
      await ux.expectFieldError(page.getByLabel('Ссылка'), /занят/)
      await ux.step('Ошибка: адрес занят', FILES.register)

      await ux.fill(title, `E2E UX Барбер ${suffix}`)
      await expect(page.getByText(/Свободна:/)).toBeVisible()
      await ux.tap(page.getByRole('button', { name: 'Далее' }))
      await page.getByRole('button', { name: /^Барбершопы/ }).waitFor()
      await ux.step('Шаг 2: вид бизнеса', FILES.register)

      await ux.tap(page.getByRole('button', { name: /^Барбершопы/ }))
      await page.getByRole('checkbox', { name: 'Мужская стрижка' }).waitFor()
      await ux.step('Шаг 3: услуги', FILES.register)
      await ux.tap(page.getByRole('button', { name: 'Далее' }))
      await ux.step('Шаг 4: контакты', FILES.register)
      await ux.tap(page.getByRole('button', { name: 'Создать страницу' }))

      await expect(page).toHaveURL(/\/manage\/e2e-ux-barber/)
      await expect(page.getByRole('heading', { name: 'Запуск записи' })).toBeVisible()
      await ux.step('Кабинет: запуск записи', FILES.cabinet)

      await ux.tap(page.getByRole('button', { name: 'Добавить мастера' }).first())
      // Toasts are dialogs too (Base UI): the sheet is the one with the form.
      const dialog = page.getByRole('dialog').filter({ has: page.getByLabel('Имя') })
      await dialog.getByLabel('Имя').waitFor()
      await ux.step('Новый мастер', [`${WEB}/views/manage/ui/Masters`, `${WEB}/shared/ui/Sheet`])
      await ux.fill(dialog.getByLabel('Имя'), 'Азамат')
      await ux.tap(dialog.getByRole('button', { name: 'Сохранить' }))
      await expect(dialog).toBeHidden()

      await ux.tap(page.getByRole('link', { name: 'Расписание' }).first())
      await expect(page).toHaveURL(/tab=schedule/)
      await ux.step('Расписание', [
        `${WEB}/views/manage/ui/ScheduleTab.tsx`,
        `${WEB}/widgets/DayCalendar`,
        `${WEB}/widgets/DayStrip`,
      ])
      ux.complete()
    },
  },
]

const flowById = (id: FlowId) => {
  const flow = flows.find((item) => item.id === id)
  if (!flow) throw new Error(`Unknown flow ${id}`)
  return flow
}

export type { Flow }
export { FILES, flowById, flows }
