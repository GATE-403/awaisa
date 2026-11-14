import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

test.describe('Cabinet analytics', () => {
  test('owner sees revenue, clients and load for the chosen period', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')

    const response = await page.request.get('/api/manage/awaisa-studio/analytics?days=7')
    expect(response.ok()).toBe(true)
    const report = await response.json()
    expect(report.daily).toHaveLength(7)
    expect(report.totals).toMatchObject({
      revenue: expect.any(Number),
      visits: expect.any(Number),
      cancellationRate: expect.any(Number),
    })
    expect(report.masters.length).toBeGreaterThan(0)

    await page.goto('/manage/awaisa-studio?tab=analytics')
    await expect(page.getByRole('link', { name: 'Аналитика' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const report30 = page
      .getByText('Выручка', { exact: true })
      .or(page.getByText('Визитов пока нет'))
    await expect(report30.first()).toBeVisible()

    await page.getByRole('group', { name: 'Период' }).getByText('Неделя').click()
    await expect(
      page.getByRole('group', { name: 'Период' }).getByRole('radio', { name: 'Неделя' }),
    ).toBeChecked()
    await expect(report30.first()).toBeVisible()
  })

  test('other accounts cannot read the numbers', async ({ page }) => {
    await signInViaApi(page, randomClientPhone())
    const response = await page.request.get('/api/manage/awaisa-studio/analytics')
    expect(response.status()).toBe(403)
  })

  test('only the offered periods are accepted', async ({ page }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const response = await page.request.get('/api/manage/awaisa-studio/analytics?days=12')
    expect(response.status()).toBe(400)
  })

  test("a master's percent turns their revenue into a payout", async ({ page }, testInfo) => {
    // The cabinet opens on the last 30 days and shows its groups only when that month had a
    // visit; a fresh database has none, so the test brings its own.
    await createPastVisit('E2E Зарплата Тестов', randomClientPhone(), 0, 3)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const managed = await (await page.request.get('/api/manage/awaisa-studio')).json()
    const master = managed.catalog.specialists[0]
    const save = (commissionPercent: number | null) =>
      page.request.put(`/api/manage/awaisa-studio/specialists/${master.id}`, {
        data: {
          name: master.name,
          role: master.role,
          serviceIds: master.serviceIds,
          isActive: master.isActive,
          branchId: master.branchId,
          phone: master.phone ?? '',
          commissionPercent,
        },
      })
    try {
      await save(40)
      const report = await (
        await page.request.get('/api/manage/awaisa-studio/analytics?days=365')
      ).json()
      const row = report.masters.find((item: { id: string }) => item.id === master.id)
      expect(row.percent).toBe(40)
      expect(row.payout).toBe(Math.round(row.revenue * 0.4))

      await page.goto('/manage/awaisa-studio?tab=analytics')
      await expect(page.getByText('Зарплата мастерам')).toBeVisible()
    } finally {
      await save(master.commissionPercent ?? null)
    }
  })
})
