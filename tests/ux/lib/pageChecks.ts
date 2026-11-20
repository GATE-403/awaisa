import type { Page } from '@playwright/test'

// Checks that run inside the page. Each returns plain data; `ux.ts` turns it into findings.
// They use `window.__uxDescribe` from the init script to name elements the same way.

type Described = { id: string; selector: string; name: string; classes: string[] }

type LayoutResult = {
  overflowX: number
  wideElements: Described[]
  clipped: (Described & { axis: 'x' | 'y'; isEllipsis: boolean; isClamp: boolean })[]
  covered: (Described & { by: Described })[]
  fixedShare: number
  fixedParts: Described[]
  /** Sideways rows that also scroll up and down a few pixels (a finger makes them wobble). */
  wobblyRows: (Described & { extra: number })[]
}

type TargetResult = (Described & {
  width: number
  height: number
  isInline: boolean
  /** WCAG 2.5.8 spacing exception: a 24px circle on it touches no other target. */
  hasSpacing: boolean
})[]

declare global {
  interface Window {
    __uxDescribe: (element: Element) => Described
    __uxName: (element: Element) => string
  }
}

const CONTROLS =
  'button:not([disabled]), a[href], input:not([type="hidden"]):not([aria-hidden="true"]):not([tabindex="-1"]), select, textarea, [role="button"], [role="radio"], [role="checkbox"], [role="tab"], [role="switch"], [role="menuitem"], [role="link"]'

const checkLayout = (page: Page) =>
  page.evaluate((controls): LayoutResult => {
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const isShown = (element: Element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return false
      const style = getComputedStyle(element)
      return style.visibility !== 'hidden' && Number(style.opacity) > 0.05
    }
    // Seen at all: no ancestor faded out (a control's own opacity is checked by `isShown`).
    const isOpaqueUp = (element: Element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) <= 0.05) return false
      }
      return true
    }
    const isPinned = (element: Element) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const position = getComputedStyle(node).position
        if (position === 'fixed' || position === 'sticky') return true
      }
      return false
    }
    const modal = [
      ...document.querySelectorAll(
        '[role="dialog"]:not([aria-modal="false"]), [aria-modal="true"]',
      ),
    ].filter(isShown)
    const scope: ParentNode = modal.at(-1) ?? document.body
    const skip = (element: Element) =>
      Boolean(element.closest('.leaflet-container, [aria-hidden="true"], [inert]')) ||
      // Inside a closed disclosure: not rendered for a person, whatever the box says.
      Boolean(element.closest('details:not([open])') && !element.closest('summary'))

    // 1. Sideways scroll and who causes it (outside sideways scrollers, which are meant to).
    const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth
    const wideElements: Described[] = []
    if (overflowX > 1) {
      for (const element of document.body.querySelectorAll('*')) {
        if (wideElements.length >= 3 || skip(element) || !isShown(element)) continue
        const rect = element.getBoundingClientRect()
        if (rect.right <= viewport.width + 1) continue
        let insideScroller = false
        for (let node = element.parentElement; node; node = node.parentElement) {
          const overflow = getComputedStyle(node).overflowX
          if (
            overflow === 'auto' ||
            overflow === 'scroll' ||
            overflow === 'hidden' ||
            overflow === 'clip'
          ) {
            insideScroller = true
            break
          }
        }
        if (
          !insideScroller &&
          ![...element.children].some(
            (child) => child.getBoundingClientRect().right > viewport.width + 1,
          )
        )
          wideElements.push(window.__uxDescribe(element))
      }
    }

    // 2. Text cut off by its own box.
    const clipped: LayoutResult['clipped'] = []
    for (const element of scope.querySelectorAll('*')) {
      if (clipped.length >= 12 || skip(element) || !isShown(element)) continue
      const hasText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      )
      if (!hasText) continue
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (rect.width <= 2 || rect.height <= 2) continue
      if (rect.bottom < 0 || rect.top > viewport.height) continue
      const cutsX =
        ['hidden', 'clip'].includes(style.overflowX) &&
        element.scrollWidth > element.clientWidth + 1
      const cutsY =
        ['hidden', 'clip'].includes(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 2
      if (!cutsX && !cutsY) continue
      clipped.push({
        ...window.__uxDescribe(element),
        axis: cutsX ? 'x' : 'y',
        isEllipsis: style.textOverflow === 'ellipsis',
        isClamp: style.webkitLineClamp !== 'none' && style.webkitLineClamp !== '',
      })
    }

    // 3. Controls whose middle is under some other content (not a sticky bar it scrolled under).
    const covered: LayoutResult['covered'] = []
    for (const element of scope.querySelectorAll(controls)) {
      if (covered.length >= 8 || skip(element) || !isShown(element)) continue
      // Put away on purpose (a floating pill tucked while the page scrolls: transparent and taking
      // no pointer): nobody can press it, so nothing covers it either.
      if (getComputedStyle(element).pointerEvents === 'none' || !isOpaqueUp(element)) continue
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue
      const hit = document.elementFromPoint(x, y)
      if (!hit || hit === element || element.contains(hit) || hit.contains(element)) continue
      if (hit.closest('label')?.contains(element)) continue
      if (element.closest('label')?.contains(hit)) continue
      if (isPinned(hit) && !isPinned(element)) continue
      // Scrolled out of its own sideways row or scroll box: hidden by the box, not covered.
      let isScrolledAway = false
      for (
        let node = element.parentElement;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node)
        if (!/(auto|scroll|hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)) continue
        const box = node.getBoundingClientRect()
        if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
          isScrolledAway = true
          break
        }
      }
      if (isScrolledAway) continue
      if (skip(hit)) continue
      // A deliberate layer (popover, search panel, sheet) over the page is not a layout bug.
      let isLayer = false
      for (
        let node: Element | null = hit;
        node && !node.contains(element);
        node = node.parentElement
      ) {
        const style = getComputedStyle(node)
        if (style.position !== 'static' && style.zIndex !== 'auto') {
          isLayer = true
          break
        }
      }
      if (isLayer) continue
      covered.push({ ...window.__uxDescribe(element), by: window.__uxDescribe(hit) })
    }

    // 4. How much of the screen fixed and sticky bars keep (matters at 200% zoom).
    let pinnedHeight = 0
    const fixedParts: Described[] = []
    if (modal.length === 0)
      for (const element of document.body.querySelectorAll('*')) {
        const style = getComputedStyle(element)
        if (style.position !== 'fixed' && style.position !== 'sticky') continue
        if (!isShown(element) || skip(element)) continue
        if (element.parentElement && isPinned(element.parentElement)) continue
        const rect = element.getBoundingClientRect()
        if (rect.width < viewport.width * 0.5 || rect.height > viewport.height * 0.9) continue
        const isStuckTop = rect.top <= 1 && rect.bottom > 0
        const isStuckBottom = rect.bottom >= viewport.height - 1 && rect.top < viewport.height
        if (!isStuckTop && !isStuckBottom) continue
        pinnedHeight += Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0)
        fixedParts.push(window.__uxDescribe(element))
      }

    // 5. A sideways row that can also scroll vertically: something pokes out of it.
    const wobblyRows: LayoutResult['wobblyRows'] = []
    for (const element of document.body.querySelectorAll('*')) {
      if (wobblyRows.length >= 5 || skip(element) || !isShown(element)) continue
      const style = getComputedStyle(element)
      if (!/(auto|scroll)/.test(style.overflowX) || style.overflowY === 'hidden') continue
      if (element.scrollWidth <= element.clientWidth + 1) continue
      const extra = element.scrollHeight - element.clientHeight
      if (extra > 1 && extra < 40) wobblyRows.push({ ...window.__uxDescribe(element), extra })
    }

    return {
      wobblyRows,
      overflowX,
      wideElements,
      clipped,
      covered,
      fixedShare: pinnedHeight / viewport.height,
      fixedParts,
    }
  }, CONTROLS)

const checkTargets = (page: Page) =>
  page.evaluate((controls): TargetResult => {
    const modal = [
      ...document.querySelectorAll(
        '[role="dialog"]:not([aria-modal="false"]), [aria-modal="true"]',
      ),
    ].filter((element) => element.getBoundingClientRect().height > 0)
    const scope: ParentNode = modal.at(-1) ?? document.body
    const seen = new Set<Element>()
    const out: TargetResult = []
    // A «stretched link» (an absolutely placed ::after) makes its whole positioned box the
    // target: a card whose title is the link is tapped anywhere on the card.
    // A positioned control may instead widen itself with a pseudo-element on negative insets
    // (an invisible 44pt hit area): its box is the union of both.
    const targetRect = (element: Element) => {
      const own = element.getBoundingClientRect()
      const isPositioned = getComputedStyle(element).position !== 'static'
      let box = own
      for (const pseudo of ['::after', '::before']) {
        const style = getComputedStyle(element, pseudo)
        if (style.content === 'none' || style.position !== 'absolute') continue
        if (!isPositioned) {
          const host = (element as HTMLElement).offsetParent
          if (host) return host.getBoundingClientRect()
          continue
        }
        const px = (value: string) => Number.parseFloat(value) || 0
        const left = Math.min(box.left, own.left + px(style.left))
        const top = Math.min(box.top, own.top + px(style.top))
        const right = Math.max(box.right, own.right - px(style.right))
        const bottom = Math.max(box.bottom, own.bottom - px(style.bottom))
        box = new DOMRect(left, top, right - left, bottom - top)
      }
      return box
    }
    const all: { element: Element; rect: DOMRect }[] = []
    for (const control of scope.querySelectorAll(controls)) {
      const element = control.closest('label') ?? control
      const rect = targetRect(element)
      if (rect.width > 0 && rect.height > 0) all.push({ element, rect })
    }
    const isSpaced = (element: Element, rect: DOMRect) => {
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      return all.every((other) => {
        if (
          other.element === element ||
          other.element.contains(element) ||
          element.contains(other.element)
        )
          return true
        const dx = Math.max(other.rect.left - cx, 0, cx - other.rect.right)
        const dy = Math.max(other.rect.top - cy, 0, cy - other.rect.bottom)
        if (Math.hypot(dx, dy) < 12) return false
        const isSmall = other.rect.width < 24 || other.rect.height < 24
        if (!isSmall) return true
        const ox = other.rect.left + other.rect.width / 2
        const oy = other.rect.top + other.rect.height / 2
        return Math.hypot(ox - cx, oy - cy) >= 24
      })
    }
    for (const control of scope.querySelectorAll(controls)) {
      if (control.closest('.leaflet-container, [aria-hidden="true"], [inert]')) continue
      if (control.closest('details:not([open])') && !control.closest('summary')) continue
      // A native radio or checkbox inside a label: the label is what a finger hits.
      const element = control.closest('label') ?? control
      if (seen.has(element)) continue
      seen.add(element)
      const rect = targetRect(element)
      if (rect.width === 0 || rect.height === 0 || element.getClientRects().length === 0) continue
      const style = getComputedStyle(element)
      if (style.visibility === 'hidden' || Number(style.opacity) < 0.05) continue
      if (rect.width >= 43.5 && rect.height >= 43.5) continue
      // Links inside running text are exempt from WCAG 2.5.8.
      const parent = element.parentElement
      const isInline =
        element.tagName === 'A' &&
        style.display === 'inline' &&
        Boolean(
          parent &&
            [...parent.childNodes].some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            ),
        )
      const isSmall = rect.width < 23.5 || rect.height < 23.5
      out.push({
        ...window.__uxDescribe(element),
        width: rect.width,
        height: rect.height,
        isInline,
        hasSpacing: isSmall ? isSpaced(element, rect) : true,
      })
    }
    return out
  }, CONTROLS)

type FieldErrorResult = {
  field: Described | null
  isInvalid: boolean
  message: (Described & { text: string; gap: number; isAnnounced: boolean }) | null
}

// The error a person needs: next to the field, in words, announced or reachable from the field.
const checkFieldError = (page: Page, fieldSelector: string, pattern: string | null) =>
  page.evaluate(
    ({ selector, pattern }): FieldErrorResult => {
      const field = document.querySelector(selector)
      if (!field) return { field: null, isInvalid: false, message: null }
      const fieldRect = field.getBoundingClientRect()
      const isInvalid =
        field.getAttribute('aria-invalid') === 'true' ||
        field.hasAttribute('data-invalid') ||
        Boolean(field.closest('[data-invalid]'))
      const ids =
        `${field.getAttribute('aria-describedby') ?? ''} ${field.getAttribute('aria-errormessage') ?? ''}`
          .split(/\s+/)
          .filter(Boolean)
      const referenced = ids
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => Boolean(element?.textContent?.trim()))
      const regex = pattern ? new RegExp(pattern) : null
      const candidates = [
        ...referenced,
        ...document.querySelectorAll<HTMLElement>(
          '[role="alert"], [aria-live], [data-error], [id$="-error"]',
        ),
      ].filter((element) => {
        const text = element.textContent?.trim() ?? ''
        const rect = element.getBoundingClientRect()
        return text && rect.height > 0 && (!regex || regex.test(text))
      })
      if (candidates.length === 0 && regex) {
        // Fall back to any visible text that says it.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode())
          if (
            regex.test(node.textContent ?? '') &&
            node.parentElement?.getBoundingClientRect().height
          )
            candidates.push(node.parentElement)
      }
      const gapTo = (element: Element) => {
        const rect = element.getBoundingClientRect()
        const vertical = Math.max(0, rect.top - fieldRect.bottom, fieldRect.top - rect.bottom)
        const horizontal = Math.max(0, rect.left - fieldRect.right, fieldRect.left - rect.right)
        return Math.round(Math.hypot(vertical, horizontal))
      }
      const nearest = candidates.sort((a, b) => gapTo(a) - gapTo(b))[0]
      if (!nearest) return { field: window.__uxDescribe(field), isInvalid, message: null }
      return {
        field: window.__uxDescribe(field),
        isInvalid,
        message: {
          ...window.__uxDescribe(nearest),
          text: (nearest.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
          gap: gapTo(nearest),
          isAnnounced:
            referenced.includes(nearest) ||
            Boolean(
              nearest.closest('[role="alert"], [aria-live="assertive"], [aria-live="polite"]'),
            ),
        },
      }
    },
    { selector: fieldSelector, pattern },
  )

type TimerResult = {
  toasts: { text: string; hasAction: boolean; lifetimeMs: number | null; leftOnItsOwn: boolean }[]
  churn: (Described & { count: number; text: string })[]
}

const collectTimers = (page: Page) =>
  page
    .evaluate((): TimerResult => {
      const store = (
        window as unknown as {
          __ux?: {
            toasts: {
              text: string
              hasAction: boolean
              addedAt: number
              removedAt: number | null
              leftOnItsOwn: boolean
            }[]
            churn: Map<Element, { element: Element; count: number }>
          }
        }
      ).__ux
      if (!store) return { toasts: [], churn: [] }
      return {
        toasts: store.toasts.map((toast) => ({
          text: toast.text,
          hasAction: toast.hasAction,
          lifetimeMs: toast.removedAt === null ? null : Math.round(toast.removedAt - toast.addedAt),
          leftOnItsOwn: toast.leftOnItsOwn,
        })),
        churn: [...store.churn.values()]
          .filter(({ element, count }) => count >= 3 && element.isConnected)
          .map(({ element, count }) => ({
            ...window.__uxDescribe(element),
            count,
            text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
          })),
      }
    })
    .catch(() => ({ toasts: [], churn: [] }) as TimerResult)

// Visible words on screen: what a person has been able to read so far.
const visibleText = (page: Page) =>
  page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')).catch(() => '')

export type { Described, FieldErrorResult, LayoutResult, TargetResult, TimerResult }
export { checkFieldError, checkLayout, checkTargets, collectTimers, visibleText }
