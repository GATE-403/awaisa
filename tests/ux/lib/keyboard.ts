import type { UxContext } from './ux'

// A person without a mouse: Tab to move, Enter/Space to act, Esc to close. Every stop on the
// way is checked: is the focus visible (2.4.7), not hidden under a sticky bar (2.4.11), on
// something that is on screen at all?

type FocusInfo = {
  id: string
  selector: string
  name: string
  role: string
  tag: string
  classes: string[]
  isInside: boolean
  isBody: boolean
  hasStyleRing: boolean
  isObscured: boolean
  isZeroSize: boolean
  box: { x: number; y: number; width: number; height: number } | null
}

type Target = { name?: RegExp; within?: string; role?: string }

const MAX_TABS = 80
const MANY_TABS = 25

const readFocus = (ux: UxContext, within: string | null) =>
  ux.page.evaluate((scope): FocusInfo => {
    const element = document.activeElement
    if (!element || element === document.body)
      return {
        id: '',
        selector: 'body',
        name: '',
        role: '',
        tag: 'body',
        classes: [],
        isInside: false,
        isBody: true,
        hasStyleRing: false,
        isObscured: false,
        isZeroSize: true,
        box: null,
      }
    const described = window.__uxDescribe(element)
    const rect = element.getBoundingClientRect()
    const ringOf = (node: Element) => {
      const style = getComputedStyle(node)
      const outline = style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0
      return (
        outline || (style.boxShadow !== 'none' && node.matches(':focus-visible, :focus-within'))
      )
    }
    // Native radios and checkboxes sit under their card: the card draws the ring.
    const hasStyleRing =
      ringOf(element) ||
      Boolean(element.closest('label') && ringOf(element.closest('label') as Element))
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = rect.width > 0 ? document.elementFromPoint(x, y) : null
    const isObscured = Boolean(
      hit &&
        hit !== element &&
        !element.contains(hit) &&
        !hit.contains(element) &&
        !hit.closest('label')?.contains(element) &&
        (() => {
          for (let node: Element | null = hit; node; node = node.parentElement) {
            const position = getComputedStyle(node).position
            if (position === 'fixed' || position === 'sticky') return !node.contains(element)
          }
          return false
        })(),
    )
    return {
      ...described,
      role: element.getAttribute('role') ?? (element as HTMLInputElement).type ?? '',
      tag: element.tagName.toLowerCase(),
      isInside: scope ? Boolean(element.closest(scope)) : true,
      isBody: false,
      hasStyleRing,
      isObscured,
      isZeroSize: rect.width < 1 || rect.height < 1,
      box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    }
  }, within)

// The page scrolls to the focused control smoothly (`scroll-behavior: smooth`): judge where it
// came to rest, not a frame of the way there.
const settleScroll = (ux: UxContext) =>
  ux.page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          const positions = () =>
            [document.scrollingElement, ...document.querySelectorAll('*')]
              .filter((node): node is Element =>
                Boolean(node && node.scrollHeight > node.clientHeight),
              )
              .slice(0, 40)
              .map((node) => `${node.scrollTop}:${node.scrollLeft}`)
              .join('|')
          let last = positions()
          let still = 0
          const started = performance.now()
          const tick = () => {
            const next = positions()
            still = next === last ? still + 1 : 0
            last = next
            if (still >= 3 || performance.now() - started > 1500) resolve()
            else requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }),
    )
    .catch(() => undefined)

class KeyboardWalker {
  private readonly ux: UxContext
  private checked = new Set<string>()

  constructor(ux: UxContext) {
    this.ux = ux
  }

  private matches(info: FocusInfo, target: Target) {
    if (info.isBody || !info.isInside) return false
    if (target.role && info.role !== target.role && info.tag !== target.role) return false
    if (target.name && !target.name.test(info.name)) return false
    return true
  }

  // A focus ring drawn by any means shows as a change of pixels around the element.
  private async isRingVisible(info: FocusInfo) {
    if (info.hasStyleRing) return true
    if (!info.box) return false
    const viewport = this.ux.page.viewportSize()
    if (!viewport) return true
    const clip = {
      x: Math.max(0, info.box.x - 6),
      y: Math.max(0, info.box.y - 6),
      width: Math.min(viewport.width, info.box.width + 12),
      height: Math.min(viewport.height, info.box.height + 12),
    }
    if (clip.width < 2 || clip.height < 2 || clip.y > viewport.height) return true
    const focused = await this.ux.page.screenshot({ clip, animations: 'disabled' })
    await this.ux.page.evaluate((id) => {
      ;(document.querySelector(`[data-ux-id="${id}"]`) as HTMLElement | null)?.blur()
    }, info.id)
    const blurred = await this.ux.page.screenshot({ clip, animations: 'disabled' })
    await this.ux.page.evaluate((id) => {
      ;(document.querySelector(`[data-ux-id="${id}"]`) as HTMLElement | null)?.focus({
        preventScroll: true,
      })
    }, info.id)
    return !focused.equals(blurred)
  }

  private async inspect(info: FocusInfo) {
    if (info.isBody || this.checked.has(info.selector + info.name)) return
    this.checked.add(info.selector + info.name)
    const base = {
      target: info.selector,
      name: info.name,
      classes: info.classes,
      shoot: `[data-ux-id="${info.id}"]`,
    }
    if (info.isZeroSize) {
      await this.ux.finding({
        ...base,
        severity: 'serious',
        rule: 'ux-focus-invisible-element',
        title: 'Фокус попадает на невидимый элемент',
        detail: `«${info.name || info.selector}» размером 0: человек не видит, где он`,
        wcag: '2.4.7',
      })
      return
    }
    if (info.isObscured)
      await this.ux.finding({
        ...base,
        severity: 'serious',
        rule: 'ux-focus-obscured',
        title: 'Элемент в фокусе спрятан под закреплённой панелью',
        detail: `«${info.name || info.selector}»`,
        wcag: '2.4.11',
      })
    if (!(await this.isRingVisible(info)))
      await this.ux.finding({
        ...base,
        severity: 'serious',
        rule: 'ux-focus-not-visible',
        title: 'Не видно, где фокус',
        detail: `«${info.name || info.selector}»: нет рамки или другого видимого изменения`,
        wcag: '2.4.7',
      })
  }

  /** Tab (or Shift+Tab) until the focus is on the target; every stop is inspected. */
  async tabTo(target: Target, label: string, reverse = false) {
    for (let count = 1; count <= MAX_TABS; count += 1) {
      await this.ux.page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
      await settleScroll(this.ux)
      const info = await readFocus(this.ux, target.within ?? null)
      await this.inspect(info)
      if (this.matches(info, target)) {
        this.ux.countAction(count)
        if (count > MANY_TABS)
          await this.ux.finding({
            severity: 'moderate',
            rule: 'ux-many-tabs',
            title: 'Далеко идти с клавиатуры',
            detail: `${count} нажатий Tab до «${label}»`,
            target: info.selector,
            classes: info.classes,
          })
        return info
      }
    }
    await this.ux.finding({
      severity: 'critical',
      rule: 'ux-keyboard-unreachable',
      title: 'Не дойти с клавиатуры',
      detail: `За ${MAX_TABS} нажатий Tab фокус так и не попал на «${label}»`,
      wcag: '2.1.1',
    })
    throw new Error(`Keyboard: «${label}» is not reachable with Tab`)
  }

  async press(key: string) {
    await this.ux.press(key)
  }

  async type(text: string) {
    this.ux.countAction()
    await this.ux.page.keyboard.type(text)
  }

  /** After Esc closes something, the focus should go back to what opened it (2.4.3). */
  async expectFocusBack(name: RegExp, label: string) {
    await this.ux.page.waitForTimeout(400)
    const info = await readFocus(this.ux, null)
    if (!name.test(info.name))
      await this.ux.finding({
        severity: 'moderate',
        rule: 'ux-focus-lost',
        title: 'После закрытия фокус не вернулся туда, откуда открыли',
        detail: `Ждали «${label}», фокус на «${info.name || info.selector}»`,
        wcag: '2.4.3',
        target: info.selector,
        classes: info.classes,
      })
  }
}

export { KeyboardWalker }
