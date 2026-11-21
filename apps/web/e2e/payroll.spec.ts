import { expect, test } from '@playwright/test'
import { randomClientPhone, signInViaApi } from './account'
import { createOwnBusiness, createVisit } from './business'

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} сом`

test.describe('Master pay', () => {
  test.skip(({ isMobile }) => isMobile, 'The cabinet sheets are checked on desktop')

  test('a scheme with a service rate and a minimum is counted, paid out and undone; a master sees only their own pay', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page, {
      services: [
        { name: 'Стрижка', durationMinutes: 60, price: 1000 },
        { name: 'Борода', durationMinutes: 30, price: 500 },
      ],
      masters: ['Азамат', 'Бекзат'],
    })
    const [azamat, bekzat] = business.masters
    const [cut, beard] = business.services
    if (!azamat || !bekzat || !cut || !beard) throw new Error('Two masters and services expected')
    const manage = `/api/manage/${business.slug}`

    // Азамат: a cut yesterday (1 000 at the price), a beard the day before (500); Бекзат: a cut.
    const cutVisit = await createVisit({
      slug: business.slug,
      serviceId: cut.id,
      specialistId: azamat.id,
      daysBack: 1,
    })
    await createVisit({
      slug: business.slug,
      serviceId: beard.id,
      specialistId: azamat.id,
      daysBack: 2,
    })
    await createVisit({
      slug: business.slug,
      serviceId: cut.id,
      specialistId: bekzat.id,
      daysBack: 1,
    })

    // The owner sets Азамат's pay in the master sheet: 40%, 300 сом a beard, 100 000 a month.
    await page.goto(`/manage/${business.slug}?tab=masters`)
    await page
      .getByRole('button', { name: /Азамат/ })
      .first()
      .click()
    await page.getByRole('button', { name: /^Зарплата/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Зарплата' })
    await sheet.getByLabel('Процент мастера').fill('40')
    await sheet.getByRole('button', { name: 'Другая ставка для услуги' }).click()
    await page.getByRole('menuitem', { name: 'Борода' }).click()
    await sheet.getByRole('button', { name: /Борода: процент или сумма/ }).click()
    await page.getByRole('menuitem', { name: 'Сумма за визит' }).click()
    await sheet.getByLabel('Борода: ставка').fill('300')
    await sheet.getByLabel('Минимум в месяц').fill('100000')
    await expect(sheet).toContainText('скидки, сертификаты, абонементы и бонусы его уменьшают')
    await sheet.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Зарплата Азамат сохранена')).toBeVisible()
    expect(await (await page.request.get(`${manage}/specialists/${azamat.id}/pay`)).json()).toEqual(
      {
        percent: 40,
        rates: [{ serviceId: beard.id, kind: 'fixed', value: 300 }],
        salary: null,
        minimum: 100_000,
      },
    )

    // The calculator: 400 from the cut, 300 from the beard, lifted to the month's minimum.
    const report = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    const row = report.masters.find((item: { id: string }) => item.id === azamat.id)
    expect(row.pay).toMatchObject({ services: 700, salary: 0, earned: 700, paid: 0 })
    expect(row.pay.minimum).toBeGreaterThan(90_000)
    expect(row.pay.total).toBe(row.pay.minimum)
    expect(row.payout).toBe(row.pay.total)
    expect(report.masters.find((item: { id: string }) => item.id === bekzat.id).pay).toBeNull()

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    const masters = page.getByRole('region', { name: 'Мастера за период' })
    const azamatRow = masters.getByRole('button', { name: /Азамат/ })
    await expect(azamatRow).toContainText(`к выплате ${money(row.pay.total)}`)
    await azamatRow.click()
    const stats = page.getByRole('dialog', { name: 'Азамат' })
    await expect(stats).toContainText('300 сом × 1')
    await expect(stats).toContainText(`40% от ${money(1000)}`)
    await expect(stats).toContainText('меньше минимума')

    // Marked paid in part, then undone.
    await stats.getByRole('button', { name: /^Отметить выплату/ }).click()
    await stats.getByLabel('Сумма выплаты').fill('20000')
    await stats.getByLabel('Комментарий к выплате').fill('аванс')
    await stats.getByRole('button', { name: /^Выплатить 20.000 сом$/ }).click()
    await expect(page.getByText('Выплата отмечена')).toBeVisible()
    await expect(stats.getByRole('heading', { name: 'Выплаты' })).toBeVisible()
    await expect(stats).toContainText(money(row.pay.total - 20_000))
    const paid = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    expect(paid.masters.find((item: { id: string }) => item.id === azamat.id).pay).toMatchObject({
      paid: 20_000,
      due: row.pay.total - 20_000,
    })

    await stats.getByRole('button', { name: `Отменить выплату ${money(20_000)}` }).click()
    await expect(page.getByText('Выплата отменена')).toBeVisible()
    await expect(stats.getByRole('heading', { name: 'Выплаты' })).toHaveCount(0)
    const undone = await (await page.request.get(`${manage}/analytics?days=30`)).json()
    expect(undone.masters.find((item: { id: string }) => item.id === azamat.id).pay).toMatchObject({
      paid: 0,
      due: row.pay.total,
      payouts: [],
    })

    // Азамат signs in for «Мой день»: his own pay only, nothing of the others.
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`${manage}/specialists/${azamat.id}`, {
          data: {
            name: 'Азамат',
            role: 'Мастер',
            serviceIds: azamat.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)
    const masterContext = await browser.newContext()
    const masterPage = await masterContext.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Азамат')
      const day = await (
        await masterPage.request.get(`/api/master/${business.slug}/day?date=${cutVisit.date}`)
      ).json()
      expect(day.pay.day).toBe(400)
      expect(day.pay.month).toBeGreaterThan(0)
      expect(day.master).not.toHaveProperty('commissionPercent')
      expect((await masterPage.request.get(`${manage}/analytics?days=30`)).status()).toBe(403)
      expect(
        (await masterPage.request.get(`${manage}/specialists/${bekzat.id}/pay`)).status(),
      ).toBe(403)

      await masterPage.goto(`/master/${business.slug}`)
      await expect(masterPage.getByText(/^За [а-я]+ заработано/)).toBeVisible()
    } finally {
      await masterContext.close()
    }

    // Administrators see no pay at all.
    const staffPhone = randomClientPhone()
    expect(
      (await page.request.post(`${manage}/members`, { data: { phone: staffPhone } })).ok(),
    ).toBe(true)
    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    try {
      await signInViaApi(staff, staffPhone, 'E2E Администратор места')
      const cabinet = await (await staff.request.get(manage)).json()
      expect(cabinet.role).toBe('staff')
      expect(cabinet.catalog.specialists[0]).not.toHaveProperty('commissionPercent')
      expect((await staff.request.get(`${manage}/specialists/${azamat.id}/pay`)).status()).toBe(403)
      expect(
        (
          await staff.request.post(`${manage}/payouts`, {
            data: {
              specialistId: azamat.id,
              amount: 1,
              from: cutVisit.date,
              to: cutVisit.date,
              paidOn: cutVisit.date,
            },
          })
        ).status(),
      ).toBe(403)
    } finally {
      await staffContext.close()
    }
  })
})
