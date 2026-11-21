import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createOwnBusiness, createVisit } from './business'

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
