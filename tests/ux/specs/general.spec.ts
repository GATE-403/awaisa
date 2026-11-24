import { expect, test } from '../lib/fixture'

// Page-wide facts that are not tied to one flow. Run on one device (`general` in personas.ts).

test('Настройка «Размер шрифта» браузера @general', async ({ ux }) => {
  ux.begin('general', 'Общее: шрифт браузера')
  const { page } = ux
  await ux.goto('/')
  await page.locator('main [data-card]').first().waitFor()
  await ux.step('Каталог', ['packages/tokens/src/index.ts'])
  // «Очень крупный» in Chrome settings sets the root font size; px-sized text ignores it.
  const sizes = await page.evaluate(() => {
    const sample = [...document.querySelectorAll('main *')].find(
      (element) =>
        [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ) && element.getBoundingClientRect().height > 0,
    )
    if (!sample) return null
    const before = Number.parseFloat(getComputedStyle(sample).fontSize)
    document.documentElement.style.fontSize = '200%'
    const after = Number.parseFloat(getComputedStyle(sample).fontSize)
    document.documentElement.style.fontSize = ''
    return { before, after }
  })
  expect(sizes).not.toBeNull()
  if (sizes && sizes.after <= sizes.before * 1.05)
    await ux.finding({
      severity: 'moderate',
      rule: 'ux-px-font-size',
      title: 'Текст не следует настройке «Размер шрифта» браузера',
      detail: `Корневой шрифт 200%, а текст остаётся ${sizes.before}px: размеры в px (packages/tokens). Масштаб страницы работает, а системная настройка - нет`,
      wcag: '1.4.4',
    })
  ux.complete()
})
