import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit, type OwnBusiness } from './business'

// The client pages are checked in a11y.spec.ts; the owner's side needs a session and a business,
// so it gets one of its own with a visit ahead (the schedule and the client base are not empty).
const TABS = ['schedule', 'clients', 'analytics', 'reviews', 'page', 'settings']

const seriousViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      help: violation.help,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }))
}

const visibleButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first()

// A sheet slides up on phones and fades in on desktop: checked once every transition on the page
// has finished (half-faded text would read as low contrast), then closed for the next one.
const checkOpen = async (page: Page, dialog: Locator, label: string) => {
  await expect(dialog).toBeVisible()
  await expect
    .poll(() =>
      dialog.evaluate(async (element) => {
        // Two frames first: an entry transition starts a frame after the dialog mounts.
        for (let frame = 0; frame < 2; frame += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        const owners: Element[] = []
        for (let node: Element | null = element; node; node = node.parentElement) owners.push(node)
        // The dialog's own and its parents' time-based animations (scroll-driven ones never end).
        const isMoving = [
          ...element.getAnimations({ subtree: true }),
          ...owners.flatMap((node) => node.getAnimations()),
        ]
          .filter((animation) => animation.timeline instanceof DocumentTimeline)
          .some((animation) => animation.playState === 'running')
        const isFaded = owners.some((node) => Number(getComputedStyle(node).opacity) < 1)
        return !isMoving && !isFaded
      }),
    )
    .toBe(true)
  expect(await seriousViolations(page), label).toEqual([])
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
}

const openTab = async (page: Page, business: OwnBusiness, tab: string) => {
  await page.goto(`/manage/${business.slug}?tab=${tab}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(business.name)
}

test.describe('Cabinet accessibility', () => {
  test('no serious violations on any cabinet tab', async ({ page }) => {
    test.setTimeout(120_000)
    const business = await createOwnBusiness(page)
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Доступность',
    })

    for (const tab of TABS) {
      await page.goto(`/manage/${business.slug}?tab=${tab}`)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(business.name)
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
      expect(await seriousViolations(page), tab).toEqual([])
    }
  })
})

test.describe('Cabinet accessibility: sheets and the dark theme', () => {
  test('no serious violations in the cabinet’s sheets and the visit inspector', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const business = await createOwnBusiness(page)
    const visit = await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Доступный клиент',
    })

    await openTab(page, business, `schedule&date=${visit.date}`)
    await visibleButton(page, 'New booking').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'New booking' }), 'New booking')
    await page
      .locator('[data-schedule-board]')
      .getByRole('button', { name: new RegExp(`, ${visit.name}, `) })
      .click()
    await checkOpen(page, page.getByRole('dialog').filter({ hasText: visit.name }), 'inspector')

    await openTab(page, business, 'clients')
    await page.getByRole('button', { name: new RegExp(visit.name) }).click()
    await checkOpen(page, page.getByRole('dialog', { name: 'Client' }), 'Client')
    await visibleButton(page, 'Mailing').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'Mailing', exact: true }), 'Mailing')
    await visibleButton(page, 'Import').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'Import' }), 'Import')

    await openTab(page, business, 'promotions')
    await page.getByRole('button', { name: 'New promotion' }).first().click()
    await checkOpen(
      page,
      page.getByRole('dialog', { name: 'New promotion', exact: true }),
      'Promotion',
    )

    await openTab(page, business, 'page')
    await visibleButton(page, 'Edit').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'Edit', exact: true }), 'Page')
    await page.getByRole('tab', { name: /Services/ }).click()
    await visibleButton(page, 'Add a service').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'New service' }), 'Service')
    await page.getByRole('tab', { name: /Specialists/ }).click()
    await visibleButton(page, 'Add a specialist').click()
    await checkOpen(page, page.getByRole('dialog', { name: 'New specialist' }), 'Specialist')

    await openTab(page, business, 'reviews')
    await page.getByRole('button', { name: 'Review replies' }).click()
    await checkOpen(page, page.getByRole('dialog', { name: 'Review replies' }), 'Replies')
  })

  test('no serious violations on any cabinet tab in the dark theme', async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ colorScheme: 'dark' })
    const business = await createOwnBusiness(page)
    await createVisit({
      slug: business.slug,
      serviceId: business.service.id,
      specialistId: business.master.id,
      name: 'E2E Тёмная тема',
    })

    for (const tab of TABS) {
      await openTab(page, business, tab)
      // The theme follows the system: the page really is dark.
      await expect
        .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
        .toMatch(/^rgb\((\d|[1-4]\d), (\d|[1-4]\d), (\d|[1-4]\d)\)$/)
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
      expect(await seriousViolations(page), tab).toEqual([])
    }
  })
})
