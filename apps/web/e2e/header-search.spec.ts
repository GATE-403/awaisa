import { expect, test } from '@playwright/test'

// The header's search panel: masters found by name, and the device's own recent searches.
test.describe('Header search', () => {
  test('a master is found by name, on the other layout too; recent searches come back', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'The header field is the desktop one')
    const business = await (await request.get('/api/businesses/lumiere-salon')).json()
    const master = business.catalog.specialists[0]
    const first = master.name.split(' ')[0] as string

    // «Азамат» typed with the English layout on: «fpfvfn».
    const ruToEn: Record<string, string> = Object.fromEntries(
      [...'йцукенгшщзхъфывапролджэячсмитьбю'].map((letter, index) => [
        letter,
        "qwertyuiop[]asdfghjkl;'zxcvbnm,."[index] ?? letter,
      ]),
    )
    const mistyped = [...first.toLowerCase()].map((letter) => ruToEn[letter] ?? letter).join('')
    const found = await (await request.get(`/api/search/masters?q=${mistyped}`)).json()
    expect(found.map((item: { id: string }) => item.id)).toContain(master.id)

    await page.goto('/')
    const field = page.getByRole('searchbox', { name: 'Search salons and specialists' })
    await field.fill(first)
    const hints = page.getByRole('region', { name: 'Suggestions' })
    const link = hints.getByRole('link', { name: new RegExp(master.name) })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', `/lumiere-salon/book?specialist=${master.id}`)

    await field.fill('маникюр')
    await field.press('Enter')
    await expect(page).toHaveURL(/q=%D0%BC/)
    await field.fill('')
    await field.click()
    const recent = page.getByRole('region', { name: 'Recent' })
    await expect(recent.getByRole('button', { name: 'маникюр' })).toBeVisible()
    await recent.getByRole('button', { name: 'Clear' }).click()
    await expect(recent).toHaveCount(0)
  })
})
