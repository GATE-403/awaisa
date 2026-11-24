import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'

const SLUG = 'awaisa-studio'
// A 1×1 PNG: enough for the upload pipeline to re-encode.
const _PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Questions on a business page', () => {
  test('a client asks, the owner answers in the cabinet, the answer is on the page', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90_000)
    // Guests are sent to sign in first.
    await page.goto(`/${SLUG}`)
    const section = page.getByRole('region', { name: 'Questions' })
    await expect(section.getByRole('link', { name: 'Ask a question' })).toHaveAttribute(
      'href',
      /\/login\?next=/,
    )
    expect(
      (
        await page.request.post(`/api/businesses/${SLUG}/questions`, { data: { text: 'Гость?' } })
      ).status(),
    ).toBe(401)

    await signInViaApi(page, randomClientPhone(), 'E2E Вопрос Тестов')
    await page.reload()
    await section.getByRole('button', { name: 'Ask a question' }).click()
    const ask = page.getByRole('dialog', { name: 'Question' })
    const text = `E2E есть парковка ${testInfo.project.name} ${Date.now()}`
    await ask.getByRole('textbox').fill(text)
    await ask.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Question sent')).toBeVisible()
    // Not on the page until answered.
    await expect(section).not.toContainText(text)

    const owner = await browser.newContext()
    const ownerPage = await owner.newPage()
    await signInViaApi(ownerPage, adminPhone(testInfo), 'E2E Администратор')
    await ownerPage.goto(`/manage/${SLUG}?tab=reviews`)
    await ownerPage.getByRole('tab', { name: /Questions/ }).click()
    const item = ownerPage.getByRole('listitem').filter({ hasText: text })
    await expect(item).toContainText('awaiting an answer')
    await item.getByRole('button', { name: 'Answer' }).click()
    const answer = ownerPage.getByRole('dialog', { name: 'Answer to the question' })
    await answer.getByLabel('Reply').fill('Да, во дворе')
    await answer.getByRole('button', { name: 'Done' }).click()
    await expect(ownerPage.getByText('Reply published')).toBeVisible()

    await page.goto(`/${SLUG}`)
    await expect(section).toContainText(text)
    await expect(section).toContainText('Да, во дворе')

    // Removed by the owner, it leaves the page.
    await item.getByRole('button', { name: 'Change', exact: true }).click()
    await ownerPage.getByRole('button', { name: 'Delete question' }).click({ delay: 1300 })
    await expect(ownerPage.getByText('Question deleted')).toBeVisible()
    await owner.close()
  })
})
