import { expect, type Page, test } from '@playwright/test'
import { randomClientPhone } from './account'
import { bishkekDay, createOwnBusiness, createVisit } from './business'

// `YYYY-MM-DD` → the import's `dd.mm.yyyy`, born in 1992 (a leap year, so 29 February fits).
const toImportBirthday = (day: string) => {
  const [, month, date] = day.split('-')
  return `${date}.${month}.1992`
}

test.describe('Cabinet client base', () => {
  test('clients fall into groups with counts; a group lists only its own; the order changes', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page)
    const visit = (name: string, phone: string, daysBack: number) =>
      createVisit({
        slug: business.slug,
        serviceId: business.service.id,
        specialistId: business.master.id,
        name,
        phone,
        daysBack,
      })
    // A regular: three visits at the 1 000 price.
    const regularPhone = randomClientPhone()
    await visit('E2E Постоянный', regularPhone, 1)
    await visit('E2E Постоянный', regularPhone, 2)
    await visit('E2E Постоянный', regularPhone, 3)
    // A newcomer who came once and paid 5 000: first by spend, last by the latest visit.
    const newcomer = await visit('E2E Новый', randomClientPhone(), 4)
    expect(
      (
        await page.request.patch(`/api/manage/${business.slug}/bookings/${newcomer.id}/outcome`, {
          data: { outcome: 'arrived', paidAmount: 5000, paymentMethod: 'cash' },
        })
      ).ok(),
    ).toBe(true)
    // Imported, never booked: one with a birthday in three days.
    const imported = await page.request.post(`/api/manage/${business.slug}/import/clients`, {
      data: {
        clients: [
          {
            name: 'E2E Именинник',
            phone: randomClientPhone(),
            birthday: toImportBirthday(bishkekDay(3)),
            note: '',
          },
          { name: 'E2E Импорт', phone: randomClientPhone(), birthday: '', note: '' },
        ],
      },
    })
    expect(imported.ok()).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=clients`)
    const tabs = page.getByRole('tablist', { name: 'Группы клиентов' })
    const tab = (name: string) => tabs.getByRole('tab', { name: new RegExp(`^${name}`) })
    await expect(tab('Все')).toContainText('4')
    await expect(tab('Новые')).toContainText('1')
    await expect(tab('Постоянные')).toContainText('1')
    await expect(tab('День рождения')).toContainText('1')
    // Empty groups are left out.
    await expect(tab('С неявками')).toHaveCount(0)
    await expect(tab('Скоро придут')).toHaveCount(0)

    const names = () => page.locator('main [class*="nameText"]').allTextContents()
    // Latest visit first, those who never came after.
    await expect.poll(names).toEqual(['E2E Постоянный', 'E2E Новый', 'E2E Именинник', 'E2E Импорт'])

    await tab('День рождения').click()
    await expect(tab('День рождения')).toHaveAttribute('aria-selected', 'true')
    await expect.poll(names).toEqual(['E2E Именинник'])
    await expect(page.getByText('День рождения в ближайшую неделю.')).toBeVisible()

    await tab('Постоянные').click()
    await expect.poll(names).toEqual(['E2E Постоянный'])
    await expect(page.getByRole('button', { name: /^E2E Постоянный/ })).toContainText('3 визита')

    await tab('Все').click()
    await page.getByRole('combobox', { name: 'Сортировка' }).click()
    await page.getByRole('option', { name: 'По тратам' }).click()
    await expect.poll(names).toEqual(['E2E Новый', 'E2E Постоянный', 'E2E Именинник', 'E2E Импорт'])
    await page.getByRole('combobox', { name: 'Сортировка' }).click()
    await page.getByRole('option', { name: 'По имени' }).click()
    await expect.poll(names).toEqual(['E2E Именинник', 'E2E Импорт', 'E2E Новый', 'E2E Постоянный'])
  })

  // Picks 15 March in the client's card (and `year` first, when given) and saves it.
  const pickBirthday = async (page: Page, year: string | null) => {
    const business = await createOwnBusiness(page)
    const phone = randomClientPhone()
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Без даты',
      phone,
      daysBack: 1,
    })

    await page.goto(`/manage/${business.slug}?tab=clients`)
    await page.getByRole('button', { name: /E2E Без даты/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Клиент' })
    await sheet.getByRole('button', { name: 'Добавить', expanded: false }).click()
    if (year) {
      await sheet.getByRole('combobox', { name: 'Год' }).click()
      await page.getByRole('option', { name: year, exact: true }).click()
    }
    await sheet.getByRole('combobox', { name: 'День' }).click()
    await page.getByRole('option', { name: '15', exact: true }).click()
    await sheet.getByRole('combobox', { name: 'Месяц' }).click()
    await page.getByRole('option', { name: 'Март' }).click()
    await expect(sheet.getByRole('combobox', { name: 'Год' })).toContainText(year ?? 'Год не важен')
    await sheet.getByRole('button', { name: 'Готово', expanded: true }).click()
    await expect(sheet).toContainText(year ? `15 марта ${year}` : '15 марта')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Карточка сохранена')).toBeVisible()

    const card = await (
      await page.request.get(`/api/manage/${business.slug}/clients/${encodeURIComponent(phone)}`)
    ).json()
    return card.birthday
  }

  test('a birthday with its year is picked in the card and saved', async ({ page }) => {
    test.setTimeout(60_000)
    expect(await pickBirthday(page, '1990')).toBe('1990-03-15')
  })

  test('a birthday without a year is kept as day and month', async ({ page }) => {
    test.setTimeout(60_000)
    expect(await pickBirthday(page, null)).toBe('1904-03-15')
  })
})
