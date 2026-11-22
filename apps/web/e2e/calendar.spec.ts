import { expect, type Page, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { expectGoodDesign } from './design'
import { API_URL } from './helpers'

const SLUG = 'awaisa-studio'

type ManagedSpecialist = {
  id: string
  name: string
  role: string
  serviceIds: string[]
  isActive: boolean
  branchId: string | null
  phone?: string
}

// A future visit with this master, booked as a guest would.
const bookVisit = async (specialist: ManagedSpecialist, name: string, phone: string) => {
  const serviceId = specialist.serviceIds[0]
  for (let offset = 2; offset <= 20; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000 + 6 * 3_600_000)
      .toISOString()
      .slice(0, 10)
    const availability = await (
      await fetch(
        `${API_URL}/availability?serviceId=${serviceId}&specialistId=${specialist.id}&date=${date}`,
      )
    ).json()
    const slot = availability.slots.find((item: { isAvailable: boolean }) => item.isAvailable)
    if (!slot) continue
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        specialistId: specialist.id,
        date,
        time: slot.time,
        name,
        phone,
        smsConfirmation: false,
      }),
    })
    if (response.ok) return (await response.json()) as { id: string }
  }
  throw new Error(`No free time for ${specialist.name}`)
}

// The feed through the web's /api rewrite, unfolded (RFC 5545 folds lines at 75 octets).
const readFeed = async (page: Page, url: string) => {
  const response = await page.request.get(new URL(url).pathname)
  const text = response.ok() ? (await response.text()).replace(/\r\n /g, '') : ''
  return { status: response.status(), type: response.headers()['content-type'] ?? '', text }
}

test.describe('Calendar subscription', () => {
  test('a master subscribes to their own visits; a new link switches the old one off', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get(`/api/manage/${SLUG}`)).json()
    const [master, other]: ManagedSpecialist[] = managed.catalog.specialists
    const masterPhone = randomClientPhone()
    const saveMaster = (phone: string) =>
      page.request.put(`/api/manage/${SLUG}/specialists/${master.id}`, {
        data: {
          name: master.name,
          role: master.role,
          serviceIds: master.serviceIds,
          isActive: master.isActive,
          branchId: master.branchId,
          phone,
        },
      })
    expect((await saveMaster(masterPhone)).ok()).toBe(true)

    const clientPhone = randomClientPhone()
    const own = await bookVisit(master, 'E2E Календарь Свой', clientPhone)
    const foreign = await bookVisit(other, 'E2E Календарь Чужой', randomClientPhone())

    const masterContext = await browser.newContext()
    const masterPage = await masterContext.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Мастер')
      // A run before may have left this master's feed: start without one.
      await masterPage.request.delete(`/api/master/${SLUG}/calendar`)
      const before = await masterPage.request.get(`/api/master/${SLUG}/calendar`)
      expect((await before.json()).isActive).toBe(false)

      // The sheet in «Мой день» makes the link and offers it to the phone's calendar.
      await masterPage.goto(`/master/${SLUG}`)
      await masterPage.getByRole('button', { name: /Календарь на телефоне/ }).click()
      const sheet = masterPage.getByRole('dialog', { name: 'Календарь на телефоне' })
      await sheet.getByRole('button', { name: 'Получить ссылку' }).click()
      const subscribe = sheet.getByRole('link', { name: 'Подписаться' })
      await expect(subscribe).toHaveAttribute(
        'href',
        /^webcal:\/\/.+\/api\/calendar\/[\w-]{43}\.ics$/,
      )
      await test.step('sheet design', () =>
        expectGoodDesign(masterPage, '[role="dialog"]:not([data-type])'))
      const firstUrl = (await subscribe.getAttribute('href'))?.replace('webcal://', 'http://') ?? ''

      const feed = await readFeed(masterPage, firstUrl)
      expect(feed.status).toBe(200)
      expect(feed.type).toContain('text/calendar')
      expect(feed.text).toContain('BEGIN:VCALENDAR')
      expect(feed.text).toContain(`UID:booking-${own.id}@awaisa.kg`)
      expect(feed.text).toContain('E2E Календарь Свой')
      expect(feed.text).not.toContain(`booking-${foreign.id}`)
      expect(feed.text).not.toContain('E2E Календарь Чужой')
      // Only the last digits of the client's number until the owner turns whole numbers on.
      expect(feed.text).toContain(`••• ••• ${clientPhone.slice(-3)}`)
      expect(feed.text).not.toContain(clientPhone.slice(4))

      // The sheet remembers the link on this device after a reload.
      await masterPage.reload()
      await masterPage.getByRole('button', { name: /Календарь на телефоне/ }).click()
      await expect(sheet.getByRole('link', { name: 'Подписаться' })).toHaveAttribute(
        'href',
        firstUrl.replace('http://', 'webcal://'),
      )

      // «Сменить ссылку»: the new one works, the old one is gone at once.
      await sheet.getByRole('button', { name: 'Сменить ссылку' }).click()
      await expect(sheet.getByRole('link', { name: 'Подписаться' })).not.toHaveAttribute(
        'href',
        firstUrl.replace('http://', 'webcal://'),
      )
      const secondUrl =
        (await sheet.getByRole('link', { name: 'Подписаться' }).getAttribute('href'))?.replace(
          'webcal://',
          'http://',
        ) ?? ''
      expect((await readFeed(masterPage, firstUrl)).status).toBe(404)
      expect((await readFeed(masterPage, secondUrl)).text).toContain(`booking-${own.id}`)

      // A made-up address is 404 too.
      expect(
        (await readFeed(masterPage, `http://x/api/calendar/${'a'.repeat(43)}.ics`)).status,
      ).toBe(404)
      // The owner gives the master's number to someone else: the link stops answering.
      expect((await saveMaster(randomClientPhone())).ok()).toBe(true)
      expect((await readFeed(masterPage, secondUrl)).status).toBe(404)
    } finally {
      await masterContext.close()
      await saveMaster(master.phone ?? '')
    }
  })

  test('the owner subscribes to one master and decides on whole numbers', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'API only')
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get(`/api/manage/${SLUG}`)).json()
    const [first, second]: ManagedSpecialist[] = managed.catalog.specialists
    const clientPhone = randomClientPhone()
    const own = await bookVisit(second, 'E2E Календарь Бизнес', clientPhone)
    const elsewhere = await bookVisit(first, 'E2E Календарь Другой мастер', randomClientPhone())

    const issued = await page.request.post(`/api/manage/${SLUG}/calendar`, {
      data: { specialistId: second.id },
    })
    expect(issued.ok()).toBe(true)
    const link = await issued.json()
    expect(link.feed).toMatchObject({ isActive: true, specialistId: second.id })

    try {
      const feed = await readFeed(page, link.url)
      expect(feed.text).toContain(`booking-${own.id}`)
      expect(feed.text).not.toContain(`booking-${elsewhere.id}`)
      expect(feed.text).toContain(`X-WR-CALNAME:${second.name}`)

      // Every master, same address.
      await page.request.patch(`/api/manage/${SLUG}/calendar`, { data: { specialistId: null } })
      expect((await readFeed(page, link.url)).text).toContain(`booking-${elsewhere.id}`)

      const shown = await page.request.put(`/api/manage/${SLUG}/calendar/phones`, {
        data: { isShown: true },
      })
      expect((await shown.json()).isPhoneShown).toBe(true)
      const local = clientPhone.slice(4)
      expect((await readFeed(page, link.url)).text).toContain(
        `+996 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
      )
    } finally {
      await page.request.put(`/api/manage/${SLUG}/calendar/phones`, { data: { isShown: false } })
      await page.request.delete(`/api/manage/${SLUG}/calendar`)
    }
    expect((await readFeed(page, link.url)).status).toBe(404)
  })

  test('the owner opens it from «Настройки → Уведомления»', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.request.delete(`/api/manage/${SLUG}/calendar`)
    await page.goto(`/manage/${SLUG}?tab=notifications`)
    const row = page.getByRole('button', { name: /Календарь на телефоне/ })
    await expect(row).toBeEnabled()
    await test.step('tab', () => expectGoodDesign(page, 'main'))
    await row.click()
    const sheet = page.getByRole('dialog', { name: 'Календарь на телефоне' })
    await expect(sheet.getByRole('combobox', { name: 'Мастер' })).toBeVisible()
    await expect(sheet.getByRole('switch', { name: 'Номера клиентов целиком' })).toBeVisible()
    await sheet.getByRole('button', { name: 'Получить ссылку' }).click()
    await expect(sheet.getByRole('link', { name: 'Подписаться' })).toHaveAttribute(
      'href',
      /^webcal:/,
    )
    await test.step('sheet', () => expectGoodDesign(page, '[role="dialog"]:not([data-type])'))
    await page.request.delete(`/api/manage/${SLUG}/calendar`)
  })
})
