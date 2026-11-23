import { expect, test } from '@playwright/test'
import { createOwnBusiness } from './business'

// The mascot over an empty place is alive: it hops in, blinks a few times and glances aside, every
// loop finite, and under reduced motion it stands still.
const readMascot = (page: import('@playwright/test').Page) =>
  page
    .locator('svg:has(mask)')
    .first()
    .evaluate((svg) => {
      const eye = svg.querySelector('ellipse')
      const eyes = svg.querySelector('mask g')
      return {
        hop: getComputedStyle(svg).animationName,
        blink: eye ? getComputedStyle(eye).animationName : 'none',
        blinks: eye ? getComputedStyle(eye).animationIterationCount : '',
        glance: eyes ? getComputedStyle(eyes).animationName : 'none',
      }
    })

test.describe('Live mascot', () => {
  test('an empty section shows the mascot hopping in and blinking a few times', async ({
    page,
  }) => {
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=clients`)
    await expect(page.getByText('Клиентов пока нет')).toBeVisible()

    const mascot = await readMascot(page)
    expect(mascot.hop).not.toBe('none')
    expect(mascot.blink).not.toBe('none')
    expect(mascot.glance).not.toBe('none')
    // Finite: no endless animation on a page.
    expect(mascot.blinks).toBe('3')
  })

  test('under reduced motion the mascot stands still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const business = await createOwnBusiness(page)
    await page.goto(`/manage/${business.slug}?tab=clients`)
    await expect(page.getByText('Клиентов пока нет')).toBeVisible()

    expect(await readMascot(page)).toMatchObject({ hop: 'none', blink: 'none', glance: 'none' })
  })
})
