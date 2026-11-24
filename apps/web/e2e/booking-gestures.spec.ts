import { expect, type Locator, type Page, test } from '@playwright/test'
import { bishkekDay } from './business'
import { bookingSteps, primaryAction } from './helpers'

// Two branches: with a service and a master in the link the stack holds three cards
// (branch, service, master) and the time step is open under it.
const SLUG = 'lumiere-salon'

type Catalog = {
  services: { id: string; name: string }[]
  specialists: { id: string; name: string; serviceIds: string[] }[]
}

const openWithServiceAndMaster = async (page: Page, date?: string) => {
  const { catalog } = (await (await page.request.get(`/api/businesses/${SLUG}`)).json()) as {
    catalog: Catalog
  }
  const master = catalog.specialists[0]
  if (!master) throw new Error('No masters in the seed')
  const serviceId = master.serviceIds[0]
  const day = date ? `&date=${date}` : ''
  await page.goto(`/${SLUG}/book?service=${serviceId}&specialist=${master.id}${day}`)
  await expect(bookingSteps(page).specialist).toBeVisible()
}

const stackOf = (page: Page) => page.locator('div:has(> section#step-service)')

const frontCardId = (page: Page) => stackOf(page).locator('section[data-front]').getAttribute('id')

const waitForStill = (locator: Locator) =>
  locator.evaluate((element) =>
    Promise.all(
      [element, ...element.querySelectorAll('*')].flatMap((node) =>
        node.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      ),
    ),
  )

// A finger on the folded stack's front card, moved by dx/dy in steps, then let go.
const dragStack = async (page: Page, dx: number, dy: number) => {
  const stack = stackOf(page)
  await waitForStill(stack)
  const box = await stack.locator('section[data-front]').boundingBox()
  if (!box) throw new Error('No front card')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(x + (dx * step) / 8, y + (dy * step) / 8)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

test.describe('Booking: the stack of done steps', () => {
  test('a sideways swipe shuffles it, a pull down fans it out, “Hide” folds it', async ({
    page,
  }) => {
    await openWithServiceAndMaster(page)
    const stack = stackOf(page)
    await expect(stack).toHaveAttribute('data-movable', 'true')
    await expect(stack.locator('section')).toHaveCount(3)
    // The newest choice is in front.
    expect(await frontCardId(page)).toBe('step-specialist')

    // A short nudge is neither a swipe nor a tap that fans it.
    await dragStack(page, -20, 0)
    expect(await frontCardId(page)).toBe('step-specialist')
    await expect(stack).not.toHaveAttribute('data-fanned', 'true')

    await dragStack(page, -120, 0)
    await expect.poll(() => frontCardId(page)).not.toBe('step-specialist')
    const afterLeft = await frontCardId(page)
    await dragStack(page, 120, 0)
    await expect.poll(() => frontCardId(page)).toBe('step-specialist')
    expect(afterLeft).not.toBe('step-specialist')

    // Pulled past a third, the stack stays fanned: every card shows “Change”.
    await dragStack(page, 0, 90)
    await expect(stack).toHaveAttribute('data-fanned', 'true')
    await expect(stack.getByRole('button', { name: 'Change', exact: true })).toHaveCount(3)
    for (const button of await stack.getByRole('button', { name: 'Change', exact: true }).all()) {
      await expect(button).toBeVisible()
    }
    // The first tap after the pull counts (the pull's own click used to swallow it).
    await stack.getByRole('button', { name: 'Hide' }).click()
    await expect(stack).toHaveAttribute('data-movable', 'true')
  })

  test('one tap fans it out, a tap outside folds it, “Change” reopens that step', async ({
    page,
  }) => {
    await openWithServiceAndMaster(page)
    const stack = stackOf(page)
    await stack.getByRole('button', { name: 'Show your choices' }).click()
    await expect(stack).toHaveAttribute('data-fanned', 'true')

    // Anywhere outside the stack folds it back, like a menu.
    await page.getByRole('heading', { name: 'When suits you?' }).click()
    await expect(stack).toHaveAttribute('data-movable', 'true')

    await stack.getByRole('button', { name: 'Show your choices' }).click()
    await bookingSteps(page).service.getByRole('button', { name: 'Change', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'What are we doing?' })).toBeVisible()
  })
})

test.describe('Booking: the time ruler', () => {
  test('a wheel turns the dial to a tick, the action offers that time, a tap takes one', async ({
    page,
  }) => {
    // Tomorrow, not today: late in the day today keeps one free time and the dial has nowhere to
    // turn (CI ran into “Choose 20:00” before and after the wheel).
    await openWithServiceAndMaster(page, bishkekDay(1))
    const ruler = page.getByRole('group', { name: 'Time' })
    await expect(ruler.locator('button[data-free]').first()).toBeVisible()
    await expect(page.getByText('Scroll the dial or tap a time')).toBeVisible()

    // The action names the free time under the needle.
    await expect(primaryAction(page)).toHaveText(/^Choose \d{2}:\d{2}$/)
    const before = await primaryAction(page).textContent()

    const box = await ruler.boundingBox()
    if (!box) throw new Error('No ruler')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 130)
    await expect(page.getByText('Scroll the dial or tap a time')).toHaveCount(0)

    // Stopped between ticks, the dial is pulled onto the nearest one.
    await expect
      .poll(() =>
        ruler.evaluate((track) => {
          const tick = track.querySelector('button')?.getBoundingClientRect().width ?? 1
          return Math.abs(track.scrollLeft / tick - Math.round(track.scrollLeft / tick))
        }),
      )
      .toBeLessThan(0.02)
    const centered = ruler.locator('button[data-centered]')
    const centeredTime = (await centered.locator('span').first().textContent())?.trim() ?? ''
    const isFree = (await centered.getAttribute('data-free')) !== null
    if (isFree) {
      await expect(primaryAction(page)).toHaveText(`Choose ${centeredTime}`)
      expect(before).not.toBe(`Choose ${centeredTime}`)
    } else {
      await expect(page.getByText('Taken - scroll on')).toBeVisible()
    }

    // A tap on a free tick takes it at once: the time joins the stack, contacts open.
    const free = ruler.locator('button[data-free]:not([disabled])').last()
    const time = (await free.locator('span').first().textContent())?.trim() ?? ''
    await free.scrollIntoViewIfNeeded()
    await free.click()
    await expect(bookingSteps(page).datetime).toContainText(time)
    await expect(bookingSteps(page).contacts.getByLabel('Name', { exact: true })).toBeVisible()
  })
})
