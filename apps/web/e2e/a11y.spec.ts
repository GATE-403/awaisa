import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/awaisa-studio',
  '/awaisa-studio/services',
  '/awaisa-studio/book',
  '/bookings',
  '/business',
  '/map',
]

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    // Map tiles keep the network busy; a short wait is enough for the page itself.
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    const serious = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => ({
        id: violation.id,
        help: violation.help,
        targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
      }))

    expect(serious).toEqual([])
  })
}
