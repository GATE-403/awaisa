import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'

const SLUG = 'awaisa-studio'

// A day far enough ahead, as dd.mm.yyyy like the exports write it.
const dayAhead = (days: number) => {
  const date = new Date(Date.now() + days * 86_400_000 + 6 * 3_600_000)
  const [year, month, day] = date.toISOString().slice(0, 10).split('-')
  return { local: `${day}.${month}.${year}`, iso: `${year}-${month}-${day}` }
}

test.describe('Import from another booking system', () => {
  test('the owner loads clients and upcoming bookings from CSV files', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Runs once: it adds bookings to the schedule')
    test.setTimeout(90_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const manage = `/api/manage/${SLUG}`
    const business = await (await page.request.get(`/api/businesses/${SLUG}`)).json()
    const master = business.catalog.specialists[2]
    const service = business.catalog.services.find(
      (item: { id: string }) => item.id === master.serviceIds[0],
    )
    const clientPhone = randomClientPhone()
    const bookingPhone = randomClientPhone()
    const day = dayAhead(26)
    const created: string[] = []

    try {
      await page.goto(`/manage/${SLUG}?tab=clients`)
      await page.getByRole('button', { name: 'Импорт', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'Импорт' })

      // Clients: YCLIENTS-style headers, «;» between cells, a quoted note with a separator.
      await sheet.getByLabel('Файл CSV').setInputFiles({
        name: 'clients.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          [
            'ФИО;Телефон;Дата рождения;Комментарий',
            `E2E Импорт Клиентов;${clientPhone};14.03.1990;"E2E любит; кофе"`,
            'E2E Без Номера;;;',
          ].join('\n'),
        ),
      })
      await expect(sheet.getByText('clients.csv · 2 строки')).toBeVisible()
      await expect(sheet.getByText(/Первая строка: E2E Импорт Клиентов/)).toBeVisible()
      await sheet.getByRole('button', { name: 'Загрузить' }).click()
      await expect(sheet.getByText('Загружено 1 · пропущено 1')).toBeVisible()
      await expect(sheet.getByText('нет телефона')).toBeVisible()
      await sheet.getByRole('button', { name: 'Готово' }).click()

      // The client is in the base before any booking, with the note and birthday.
      await page.getByLabel('Поиск клиента').fill('E2E Импорт Клиентов')
      await expect(page.getByRole('button', { name: /E2E Импорт Клиентов/ })).toBeVisible()
      const card = await (
        await page.request.get(`${manage}/clients/${encodeURIComponent(clientPhone)}`)
      ).json()
      expect(card).toMatchObject({
        name: 'E2E Импорт Клиентов',
        note: 'E2E любит; кофе',
        birthday: '1990-03-14',
      })

      // Bookings: Altegio-style headers, comma-separated; an off-grid time goes in as it is,
      // a past visit and an unknown service are skipped with the reason.
      await page.getByRole('button', { name: 'Импорт', exact: true }).click()
      await sheet.getByRole('radio', { name: 'Записи' }).check({ force: true })
      await sheet.getByLabel('Файл CSV').setInputFiles({
        name: 'records.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
          [
            'Дата,Время,Услуги,Сотрудник,Клиент,Телефон,Комментарий',
            `${day.local},07:10,${service.name},${master.name},E2E Импорт Записи,${bookingPhone},E2E из YCLIENTS`,
            `01.01.2020,10:00,${service.name},${master.name},E2E Прошлый,${bookingPhone},`,
            `${day.local},08:40,Несуществующая услуга,${master.name},E2E Импорт Записи,${bookingPhone},`,
          ].join('\n'),
        ),
      })
      await expect(sheet.getByText('records.csv · 3 строки')).toBeVisible()
      await sheet.getByRole('button', { name: 'Загрузить' }).click()
      await expect(sheet.getByText('Загружено 1 · пропущено 2')).toBeVisible()
      await expect(sheet.getByText('визит уже прошёл')).toBeVisible()
      await expect(sheet.getByText('нет услуги «Несуществующая услуга»')).toBeVisible()

      const schedule = await (await page.request.get(`${manage}/schedule?date=${day.iso}`)).json()
      const booking = schedule.bookings.find(
        (item: { customerName: string }) => item.customerName === 'E2E Импорт Записи',
      )
      expect(booking).toMatchObject({
        time: '07:10',
        specialistId: master.id,
        serviceId: service.id,
        comment: 'E2E из YCLIENTS',
        status: 'confirmed',
      })
      created.push(booking.id)

      // The same file again adds nothing.
      const again = await page.request.post(`${manage}/import/bookings`, {
        data: {
          bookings: [
            {
              date: day.local,
              time: '07:10',
              service: service.name,
              master: master.name,
              name: 'E2E Импорт Записи',
              phone: bookingPhone,
            },
          ],
        },
      })
      expect(await again.json()).toMatchObject({
        imported: 0,
        skipped: [{ row: 1, reason: 'уже импортирована' }],
      })
    } finally {
      for (const id of created) await page.request.post(`${manage}/bookings/${id}/cancel`)
    }
  })

  test('guests cannot import', async ({ page, isMobile }) => {
    test.skip(isMobile, 'API only')
    const response = await page.request.post(`/api/manage/${SLUG}/import/clients`, {
      data: { clients: [{ phone: '+996555000000' }] },
    })
    expect(response.status()).toBe(401)
  })
})
