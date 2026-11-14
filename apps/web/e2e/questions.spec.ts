import { expect, test } from '@playwright/test'
import { adminPhone, randomClientPhone, signInViaApi } from './account'
import { createPastVisit } from './visits'

const SLUG = 'awaisa-studio'
// A 1×1 PNG: enough for the upload pipeline to re-encode.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Rating in one tap', () => {
  test('«Как прошло?» opens the review with the stars tapped; photos go with it', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    const phone = randomClientPhone()
    await signInViaApi(page, phone, 'E2E Оценка Тестов')
    const { booking } = await createPastVisit('E2E Оценка Тестов', phone, 0, 2)

    // One's own profile says a visit waits for its stars.
    const settings = await (await page.request.get('/api/me/profile')).json()
    const own = await (await page.request.get(`/api/profiles/${settings.id}`)).json()
    expect(own.awaitingReview).toBeGreaterThanOrEqual(1)

    await page.goto('/bookings')
    const card = page.getByRole('region', { name: 'Как прошло?' })
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: '4 из 5' }).click()
    const sheet = page.getByRole('dialog')
    await expect(sheet.getByText('Хорошо')).toBeVisible()
    await sheet.getByLabel('Фото к отзыву').setInputFiles({
      name: 'work.png',
      mimeType: 'image/png',
      buffer: PIXEL,
    })
    await expect(sheet.getByRole('img', { name: 'Фото 1' })).toBeVisible()
    const comment = `E2E фото ${Date.now()}`
    await sheet.getByLabel(/Расскажите подробнее/).fill(comment)
    await sheet.getByRole('button', { name: 'Отправить отзыв' }).click()
    await expect(page.getByText('Спасибо за отзыв')).toBeVisible()
    await expect(card).toHaveCount(0)

    const review = await (await page.request.get(`/api/bookings/${booking.id}/review`)).json()
    expect(review.visit.review.rating).toBe(4)
    const reviews = await (
      await page.request.get(`/api/businesses/${SLUG}/reviews?limit=50`)
    ).json()
    const mine = reviews.items.find(
      (item: { comment: string; photos: string[] }) => item.comment === comment,
    )
    expect(mine?.photos).toHaveLength(1)
  })
})

test.describe('Questions on a business page', () => {
  test('a client asks, the owner answers in the cabinet, the answer is on the page', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(90_000)
    // Guests are sent to sign in first.
    await page.goto(`/${SLUG}`)
    const section = page.getByRole('region', { name: 'Вопросы' })
    await expect(section.getByRole('link', { name: 'Задать вопрос' })).toHaveAttribute(
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
    await section.getByRole('button', { name: 'Задать вопрос' }).click()
    const ask = page.getByRole('dialog', { name: 'Вопрос' })
    const text = `E2E есть парковка ${testInfo.project.name} ${Date.now()}`
    await ask.getByRole('textbox').fill(text)
    await ask.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByText('Вопрос отправлен')).toBeVisible()
    // Not on the page until answered.
    await expect(section).not.toContainText(text)

    const owner = await browser.newContext()
    const ownerPage = await owner.newPage()
    await signInViaApi(ownerPage, adminPhone(testInfo), 'E2E Администратор')
    await ownerPage.goto(`/manage/${SLUG}?tab=reviews`)
    await ownerPage.getByRole('tab', { name: /Вопросы/ }).click()
    const item = ownerPage.getByRole('listitem').filter({ hasText: text })
    await expect(item).toContainText('ждёт ответа')
    await item.getByRole('button', { name: 'Ответить' }).click()
    const answer = ownerPage.getByRole('dialog', { name: 'Ответ на вопрос' })
    await answer.getByLabel('Ответ').fill('Да, во дворе')
    await answer.getByRole('button', { name: 'Готово' }).click()
    await expect(ownerPage.getByText('Ответ опубликован')).toBeVisible()

    await page.goto(`/${SLUG}`)
    await expect(section).toContainText(text)
    await expect(section).toContainText('Да, во дворе')

    // Removed by the owner, it leaves the page.
    await item.getByRole('button', { name: 'Изменить' }).click()
    await ownerPage.getByRole('button', { name: 'Удалить вопрос' }).click()
    await expect(ownerPage.getByText('Вопрос удалён')).toBeVisible()
    await owner.close()
  })
})
