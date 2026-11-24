import { expect, test } from '@playwright/test'
import { adminPhone, signInViaApi } from './account'

const SLUG = 'kings-barbershop'

test.describe('New booking in the cabinet', () => {
  test('a client who was here before is offered while typing and fills the number', async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'The sheet is the same on phones')
    await signInViaApi(page, adminPhone(testInfo), 'E2E Администратор')
    const list = await (
      await page.request.get(`/api/manage/${SLUG}/clients?q=&segment=all&sort=visits&limit=1`)
    ).json()
    const client = list.items[0]
    expect(client?.name).toBeTruthy()

    await page.goto(`/manage/${SLUG}?tab=schedule`)
    await page.getByRole('button', { name: 'New booking', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'New booking' }).last()
    await sheet.getByPlaceholder('Name').fill(client.name.slice(0, 3))

    const suggestions = sheet.getByRole('list', { name: 'Were here before' })
    await suggestions
      .getByRole('button', { name: new RegExp(client.name) })
      .first()
      .click()
    await expect(sheet.getByPlaceholder('Name')).toHaveValue(client.name)
    await expect(sheet.getByRole('textbox', { name: 'Phone' })).toHaveValue(
      new RegExp(client.phone.slice(-3)),
    )
    await expect(suggestions).toHaveCount(0)

    // The comment takes several lines instead of running off its row.
    const comment = sheet.getByRole('textbox', { name: 'Comment' })
    await comment.fill('Короче по бокам, длину сверху оставить. Придёт на 10 минут раньше.')
    expect(await comment.evaluate((element) => element.tagName)).toBe('TEXTAREA')
  })
})
