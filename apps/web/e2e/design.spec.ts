import { expect, test } from '@playwright/test'
import { adminPhone, forgetSession, randomClientPhone, signInViaApi } from './account'
import { bishkekDay, createOwnBusiness, createVisit } from './business'
import { expectGoodDesign } from './design'

// The design rules from docs/design/patterns.md (“Design tests”) on real screens, phone and
// desktop: what the owner once had to point out must never reach them again.

const SLUG = 'awaisa-studio'

test.describe('Design', () => {
  test('“My day”: the outcome control fits its track and the day is not a row of tiles', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, { masters: ['Азамат'] })
    const masterPhone = randomClientPhone()
    expect(
      (
        await page.request.put(`/api/manage/${business.slug}/specialists/${business.master.id}`, {
          data: {
            name: 'Азамат',
            role: 'Specialist',
            serviceIds: business.master.serviceIds,
            phone: masterPhone,
          },
        })
      ).ok(),
    ).toBe(true)
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      daysBack: 1,
    })

    const context = await browser.newContext()
    const masterPage = await context.newPage()
    try {
      await signInViaApi(masterPage, masterPhone, 'E2E Азамат')
      await masterPage.goto(`/master/${business.slug}?date=${bishkekDay(-1)}`)
      await expect(masterPage.getByRole('group', { name: /Visit outcome/ }).first()).toBeVisible()
      await expectGoodDesign(masterPage, 'main')
    } finally {
      await context.close()
    }
  })

  test('the master pay sheet: one main action, as wide as the groups, last in the sheet', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const business = await createOwnBusiness(page, { masters: ['Азамат'] })
    const manage = `/api/manage/${business.slug}`
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      daysBack: 1,
    })
    expect(
      (
        await page.request.put(`${manage}/specialists/${business.master.id}/pay`, {
          data: {
            percent: 40,
            rates: [],
            salary: { kind: 'month', amount: 30_000 },
            minimum: null,
          },
        })
      ).ok(),
    ).toBe(true)
    const today = bishkekDay()
    expect(
      (
        await page.request.post(`${manage}/payouts`, {
          data: {
            specialistId: business.master.id,
            amount: 1_000,
            from: bishkekDay(-29),
            to: today,
            paidOn: today,
          },
        })
      ).ok(),
    ).toBe(true)

    await page.goto(`/manage/${business.slug}?tab=analytics`)
    await page
      .getByRole('region', { name: 'Specialists for the period' })
      .getByRole('button', { name: /Азамат/ })
      .click()
    const sheet = page.getByRole('dialog', { name: 'Азамат' })
    await expect(sheet.getByRole('heading', { name: 'Payouts' })).toBeVisible()
    await expectGoodDesign(page, '[role="dialog"]:not([data-type])')
  })

  test('the profile: one axis under the face, bare glyphs in settings, sign out without a menu of one', async ({
    page,
  }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    await page.goto('/bookings')
    await expect(page.getByRole('region', { name: 'Profile' })).toBeVisible()
    await test.step('account card', () => expectGoodDesign(page, 'main'))
    await page.goto('/bookings?tab=settings')
    const signOut = page.getByRole('button', { name: 'Sign out' })
    await expect(signOut).toBeVisible()
    await test.step('settings', () => expectGoodDesign(page, '[role="tabpanel"]'))
    await signOut.click()
    forgetSession(adminPhone(testInfo))
    await test.step('sign out', () => expectGoodDesign(page))
  })

  test('public pages keep the design rules', async ({ page }) => {
    for (const path of ['/', `/${SLUG}`, `/${SLUG}/services`, '/top', '/bookings']) {
      await page.goto(path)
      await expect(page.locator('main').first()).toBeVisible()
      await expect(page.locator('[data-page-skeleton]')).toHaveCount(0, { timeout: 15_000 })
      await test.step(path, () => expectGoodDesign(page, 'main'))
    }
  })

  test('the cabinet keeps the design rules', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    for (const tab of [
      'schedule',
      'clients',
      'analytics',
      'cash',
      'reviews',
      'page',
      'settings',
      'fiscal',
      'billing',
    ]) {
      await page.goto(`/manage/${SLUG}?tab=${tab}`)
      await expect(page.locator('[data-page-skeleton]')).toHaveCount(0, { timeout: 15_000 })
      await page.waitForTimeout(500)
      await test.step(tab, () => expectGoodDesign(page, 'main'))
    }
  })

  test('the schedule toolbar keeps its controls apart, also on a narrow phone', async ({
    page,
  }, testInfo) => {
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const isPhone = testInfo.project.name === 'mobile'
    // Pixel 7 is 412pt wide, where the floating toolbar just fits; it overflowed on 390 and 375.
    for (const width of isPhone ? [412, 375, 360] : [1440]) {
      for (const scheme of ['light', 'dark'] as const) {
        await page.setViewportSize({ width, height: isPhone ? 840 : 900 })
        await page.emulateMedia({ colorScheme: scheme })
        await page.goto(`/manage/${SLUG}?tab=schedule`)
        const toolbar = page.getByRole('group', { name: 'Schedule view' }).locator('..')
        await expect(toolbar).toBeVisible({ timeout: 15_000 })
        // Both views: the knob slides to the chosen segment and is judged once it has settled.
        for (const view of ['Timeline', 'Columns']) {
          await toolbar.getByTitle(view).click()
          await test.step(`${width}pt ${scheme} ${view}`, () => expectGoodDesign(page, 'main'))
        }
      }
    }
  })
})
