import { expect, type Page } from '@playwright/test'

// Design defects a person sees at a glance, checked in the page like the a11y scan. Each rule is
// one the owner had to point out by hand (docs/design/patterns.md, «Тесты на дизайн»), so a screen
// that repeats it fails the run instead of reaching the owner again.

type DesignFinding = { rule: DesignRule; target: string; detail: string }

type DesignRule =
  /** Words or segments poke out of the capsule, track or card that draws them. */
  | 'sticks-out'
  /** Figures stacked over captions in tiles parted by vertical lines: a dashboard, not our style. */
  | 'stat-tiles'
  /** A lone action narrower than the groups it stands under. */
  | 'narrow-action'
  /** More actions after a sheet's main action: the main one is the last thing in the sheet. */
  | 'action-after-primary'
  /** A button in a sheet that leads to a whole section, dropping what the sheet was about. */
  | 'contextless-link'
  /** A glyph on a coloured tile in a row: the old Settings look, glyphs are bare and quiet now. */
  | 'glyph-tile'
  /** A menu of one item: a second «are you sure» tap dressed as a menu. */
  | 'single-item-menu'
  /** Two actions side by side under a centred head, of different widths: the gap leaves the axis. */
  | 'off-axis-pair'
  /** Controls in one capsule or toolbar lying over each other (a segmented knob over a glyph). */
  | 'overlap'

const RULE_TITLES: Record<DesignRule, string> = {
  'sticks-out': 'вылезает за свой фон',
  'stat-tiles': 'цифры в плитках с вертикальными разделителями',
  'narrow-action': 'кнопка уже групп над ней',
  'action-after-primary': 'действия после главной кнопки листа',
  'contextless-link': 'кнопка уводит в общий раздел без контекста',
  'glyph-tile': 'иконка на цветной плитке',
  'single-item-menu': 'меню из одного пункта вместо действия',
  'off-axis-pair': 'пара кнопок не на общей оси',
  overlap: 'элементы капсулы налезают друг на друга',
}

const findDesignDefects = (page: Page, scope?: string) =>
  page.evaluate((scopeSelector): DesignFinding[] => {
    const root: Element = (scopeSelector && document.querySelector(scopeSelector)) || document.body
    // Toasts are dialogs too (data-type); only sheets and dialogs of the page count here.
    const isSheet = (element: Element) =>
      element.getAttribute('role') === 'dialog' && !element.hasAttribute('data-type')
    const out: DesignFinding[] = []

    const isShown = (element: Element) => {
      const rect = element.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return false
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.visibility === 'hidden' || style.display === 'none') return false
        if (Number(style.opacity) <= 0.05) return false
      }
      // What is seen counts, so decorative (aria-hidden) and inert parts are judged too.
      return !element.closest('.leaflet-container')
    }
    const name = (element: Element) => {
      const label =
        element.getAttribute('aria-label') ??
        (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)
      const className = (element.getAttribute('class') ?? '').split(/\s+/)[0] ?? ''
      return `${element.tagName.toLowerCase()}${className ? `.${className.replace(/_[A-Za-z0-9-]+$/, '')}` : ''} «${label}»`
    }
    const isPainted = (style: CSSStyleDeclaration) => {
      const background = style.backgroundColor
      const hasFill =
        background !== 'transparent' &&
        !/rgba\([^)]*,\s*0\)$/.test(background) &&
        background !== 'rgba(0, 0, 0, 0)'
      const hasBorder =
        Number.parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none'
      return hasFill || hasBorder || style.backgroundImage !== 'none'
    }
    const isScroller = (style: CSSStyleDeclaration) =>
      /(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)
    const isClipping = (style: CSSStyleDeclaration) =>
      /(hidden|clip)/.test(`${style.overflowX} ${style.overflowY}`)
    const isOutOfFlow = (element: Element) => {
      const position = getComputedStyle(element).position
      return position === 'absolute' || position === 'fixed'
    }
    const hasOwnText = (element: Element) =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      )

    // 1. Something drawn sticks out of the painted box that holds it (a segment past its track,
    //    a word past its capsule). Absolutely placed parts (badges, hit areas) hang out on purpose.
    for (const box of root.querySelectorAll('*')) {
      if (out.filter((item) => item.rule === 'sticks-out').length >= 5) break
      if (!isShown(box)) continue
      const style = getComputedStyle(box)
      if (!isPainted(style) || isScroller(style) || isClipping(style)) continue
      if (box === document.body || box === document.documentElement) continue
      const outer = box.getBoundingClientRect()
      // A hairline (the timeline's red «now» line) is not a capsule: its time hangs across it.
      if (outer.width <= 3 || outer.height <= 3) continue
      for (const child of box.querySelectorAll('*')) {
        if (!isShown(child) || isOutOfFlow(child)) continue
        if (!hasOwnText(child) && !isPainted(getComputedStyle(child))) continue
        // Inside a scroller, a clipping box (an ellipsis cuts the words there) or an absolute
        // layer of its own: that box is the one to judge.
        let isNested = false
        for (let node = child.parentElement; node && node !== box; node = node.parentElement) {
          const nodeStyle = getComputedStyle(node)
          if (
            isScroller(nodeStyle) ||
            isClipping(nodeStyle) ||
            nodeStyle.position === 'absolute' ||
            nodeStyle.position === 'fixed'
          ) {
            isNested = true
            break
          }
        }
        if (isNested) continue
        const inner = child.getBoundingClientRect()
        const past = Math.max(outer.left - inner.left, inner.right - outer.right)
        if (past > 2) {
          out.push({
            rule: 'sticks-out',
            target: name(child),
            detail: `выходит на ${Math.round(past)}px за ${name(box)}`,
          })
          break
        }
      }
    }

    // 2. Figures in tiles: two or more side-by-side cells, each a value over a caption, with
    //    vertical lines between them. The quiet style says facts in one footnote line instead.
    const hasVerticalRule = (cell: Element) => {
      const cellRect = cell.getBoundingClientRect()
      const style = getComputedStyle(cell)
      const side = (width: string, kind: string) => Number.parseFloat(width) > 0 && kind !== 'none'
      if (side(style.borderLeftWidth, style.borderLeftStyle)) return true
      if (side(style.borderRightWidth, style.borderRightStyle)) return true
      for (const pseudo of ['::before', '::after']) {
        const part = getComputedStyle(cell, pseudo)
        if (part.content === 'none' || part.content === 'normal') continue
        const width = Number.parseFloat(part.width)
        const height = Number.parseFloat(part.height)
        if (width > 0 && width <= 2 && height > cellRect.height * 0.4) return true
      }
      return false
    }
    for (const row of root.querySelectorAll('*')) {
      if (!isShown(row)) continue
      const cells = [...row.children].filter(isShown)
      if (cells.length < 2) continue
      const tops = cells.map((cell) => Math.round(cell.getBoundingClientRect().top))
      if (Math.max(...tops) - Math.min(...tops) > 4) continue
      const isStacked = (cell: Element) => {
        const lines = [...cell.querySelectorAll('*')].filter(
          (part) => hasOwnText(part) && isShown(part),
        )
        if (lines.length < 2) return false
        const [first, second] = lines.map((line) => line.getBoundingClientRect())
        return Boolean(first && second && second.top >= first.bottom - 2)
      }
      if (!cells.every(isStacked)) continue
      if (
        !cells.some(hasVerticalRule) &&
        !cells.some((cell) => cell.getBoundingClientRect().width <= 2)
      )
        continue
      out.push({
        rule: 'stat-tiles',
        target: name(row),
        detail: `${cells.length} плитки «число над подписью» с вертикальными линиями`,
      })
    }

    // 3 to 5. Actions: kit buttons and button links carry data-variant.
    const actions = [...root.querySelectorAll('[data-variant]')].filter(
      (element) =>
        isShown(element) &&
        /^(primary|secondary|outline|danger|contrast)$/.test(
          element.getAttribute('data-variant') ?? '',
        ),
    )
    for (const action of actions) {
      const rect = action.getBoundingClientRect()
      // The column the action stands in: the first ancestor wider than the action.
      let column = action.parentElement
      while (column && column.getBoundingClientRect().width <= rect.width + 1)
        column = column.parentElement
      if (!column) continue
      const columnStyle = getComputedStyle(column)
      const isRow =
        columnStyle.display.includes('flex') && !columnStyle.flexDirection.startsWith('column')
      const sharesLine = [...column.children].some((other) => {
        if (other.contains(action) || !isShown(other)) return false
        const box = other.getBoundingClientRect()
        return box.bottom > rect.top + 2 && box.top < rect.bottom - 2
      })
      if (isRow || sharesLine) continue
      if (action.closest('[data-floating], [role="toolbar"], [role="alertdialog"]')) continue
      const groups = [...column.children].filter((other) => {
        if (other.contains(action) || !isShown(other)) return false
        const box = other.getBoundingClientRect()
        return (
          isPainted(getComputedStyle(other)) ||
          [...other.querySelectorAll('*')].some(
            (part) =>
              isPainted(getComputedStyle(part)) &&
              part.getBoundingClientRect().width >= box.width - 2,
          )
        )
      })
      const widest = Math.max(0, ...groups.map((group) => group.getBoundingClientRect().width))
      if (widest > 0 && rect.width < widest - 8)
        out.push({
          rule: 'narrow-action',
          target: name(action),
          detail: `${Math.round(rect.width)}px под группами в ${Math.round(widest)}px`,
        })
    }

    const sheets = [...(isSheet(root) ? [root] : []), ...root.querySelectorAll('[role="dialog"]')]
    for (const dialog of sheets) {
      if (!isSheet(dialog) || !isShown(dialog)) continue
      const inBody = actions.filter(
        (action) => dialog.contains(action) && !action.closest('header, [data-sheet-bar]'),
      )
      const main = inBody.find((action) => action.getAttribute('data-variant') === 'primary')
      if (main) {
        const after = [...dialog.querySelectorAll('button, a[href]')].filter(
          (control) =>
            isShown(control) &&
            !control.closest('header, [data-sheet-bar]') &&
            main.compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING &&
            !main.contains(control),
        )
        if (after.length > 0)
          out.push({
            rule: 'action-after-primary',
            target: name(main),
            detail: `после неё ещё ${after.map(name).join(', ')}`,
          })
      }
      for (const link of dialog.querySelectorAll('a[href][data-variant]')) {
        if (!isShown(link)) continue
        const url = new URL((link as HTMLAnchorElement).href, location.href)
        const params = [...url.searchParams.keys()]
        if (
          url.pathname === location.pathname &&
          params.length > 0 &&
          params.every((key) => key === 'tab')
        )
          out.push({
            rule: 'contextless-link',
            target: name(link),
            detail: `ведёт на ${url.search} без того, о ком или о чём лист`,
          })
      }
    }

    // 6. Glyphs on coloured tiles beside a row's words. Avatars, logos and photos are pictures,
    //    not glyphs; a round glyph button is a control of its own.
    for (const tile of root.querySelectorAll('*')) {
      if (out.filter((item) => item.rule === 'glyph-tile').length >= 3) break
      if (!isShown(tile) || isOutOfFlow(tile)) continue
      if (tile.matches('button, a, [role="button"]') || tile.querySelector('button, a, img'))
        continue
      const rect = tile.getBoundingClientRect()
      if (rect.width < 18 || rect.width > 48 || Math.abs(rect.width - rect.height) > 4) continue
      const style = getComputedStyle(tile)
      if (!isPainted(style) || hasOwnText(tile) || !tile.querySelector('svg')) continue
      // Faces and logos are round pictures; glyph tiles were rounded squares.
      if (Number.parseFloat(style.borderTopLeftRadius) >= rect.width / 2 - 1) continue
      const row = tile.closest('li, a, button, label, [role="row"]')
      if (!row || !(row.textContent ?? '').trim()) continue
      out.push({
        rule: 'glyph-tile',
        target: name(row),
        detail: `иконка на плитке ${style.backgroundColor}`,
      })
    }

    // 7. A menu that offers one thing: the trigger should simply do it.
    for (const menu of document.querySelectorAll('[role="menu"]')) {
      if (!isShown(menu)) continue
      const items = [...menu.querySelectorAll('[role="menuitem"]')].filter(isShown)
      if (items.length === 1 && items[0])
        out.push({
          rule: 'single-item-menu',
          target: name(items[0]),
          detail:
            'единственный пункт меню повторяет кнопку: действие делай сразу (с «Вернуть») или удержанием',
        })
    }

    // 8. Two or more kit actions side by side, centred under a centred head: equal widths keep the
    //    gap between them on the same axis as the face and the name.
    for (const row of root.querySelectorAll('*')) {
      if (!isShown(row)) continue
      const pair = [...row.children].filter(
        (child) => isShown(child) && child.hasAttribute('data-variant'),
      )
      if (pair.length < 2 || pair.length !== [...row.children].filter(isShown).length) continue
      // Laid out in one line and centred in what holds them (flex, grid or anything else).
      const boxes = pair.map((child) => child.getBoundingClientRect())
      const tops = boxes.map((box) => Math.round(box.top))
      if (Math.max(...tops) - Math.min(...tops) > 2) continue
      const holder = row.parentElement?.getBoundingClientRect()
      const left = Math.min(...boxes.map((box) => box.left))
      const right = Math.max(...boxes.map((box) => box.right))
      if (!holder || Math.abs((left + right) / 2 - (holder.left + holder.right) / 2) > 2) continue
      if (left - holder.left < 8) continue
      const widths = pair.map((child) => child.getBoundingClientRect().width)
      const spread = Math.max(...widths) - Math.min(...widths)
      if (spread > 4)
        out.push({
          rule: 'off-axis-pair',
          target: name(row),
          detail: `ширины ${widths.map(Math.round).join(' и ')}px: просвет между ними уходит с оси на ${Math.round(spread / 2)}px`,
        })
    }

    // 9. Controls of one capsule or toolbar lie side by side, never over each other. A segmented
    //    control's knob counts too: it sits exactly over its own segment and touches no other
    //    control (it once spilled with its segment onto the schedule's «На всю ширину» glyph on a
    //    375pt phone). Checked per holder, so a floating bar over the page or a calendar's
    //    stacked visits are not compared with what lies under them.
    const holders = [...root.querySelectorAll('*')].filter((holder) => {
      if (!isShown(holder)) return false
      if (holder.matches('fieldset, [role="group"], [role="toolbar"], [role="radiogroup"]'))
        return true
      const style = getComputedStyle(holder)
      if (style.position === 'fixed' && holder.querySelector('button, a[href], label')) return true
      const rect = holder.getBoundingClientRect()
      return (
        isPainted(style) &&
        rect.height <= 64 &&
        Number.parseFloat(style.borderTopLeftRadius) >= rect.height / 2 - 1 &&
        holder.querySelectorAll('button, a[href], label').length > 1
      )
    })
    // The knob: a painted, wordless, absolutely placed layer of a fieldset drawn under the segments.
    const isKnob = (element: Element) =>
      element.parentElement?.tagName === 'FIELDSET' &&
      element.getAttribute('aria-hidden') === 'true' &&
      getComputedStyle(element).position === 'absolute' &&
      isPainted(getComputedStyle(element)) &&
      !(element.textContent ?? '').trim()
    // Parts placed on their own layer (a popover, a sticky row) belong to that layer, not here.
    const layerOf = (element: Element, holder: Element) => {
      for (let node = element.parentElement; node && node !== holder; node = node.parentElement) {
        if (/^(absolute|fixed|sticky)$/.test(getComputedStyle(node).position)) return node
      }
      return holder
    }
    const overlapOf = (a: DOMRect, b: DOMRect) =>
      Math.min(
        Math.min(a.right, b.right) - Math.max(a.left, b.left),
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
      )
    const reported = new Set<Element>()
    for (const holder of holders) {
      if (out.filter((item) => item.rule === 'overlap').length >= 5) break
      const controls = [...holder.querySelectorAll('button, a[href], label, *')].filter(
        (element) =>
          isShown(element) &&
          (isKnob(element) ||
            (element.matches('button, a[href], label') &&
              !element.parentElement?.closest('button, a[href], label'))) &&
          layerOf(element, holder) === holder,
      )
      for (const [index, first] of controls.entries()) {
        const box = first.getBoundingClientRect()
        for (const second of controls.slice(index + 1)) {
          if (first.contains(second) || second.contains(first)) continue
          if (reported.has(first) && reported.has(second)) continue
          const other = second.getBoundingClientRect()
          const depth = overlapOf(box, other)
          if (depth <= 2) continue
          const knob = isKnob(first) ? first : isKnob(second) ? second : null
          const segment = knob === first ? second : first
          if (knob && segment.parentElement === knob.parentElement) {
            // Over its own segment: it must cover that one exactly, give or take a pixel.
            const knobBox = knob.getBoundingClientRect()
            const segmentBox = segment.getBoundingClientRect()
            const isOwn = segment.matches(
              ':has(:checked), [aria-pressed="true"], [aria-selected="true"], [aria-current]:not([aria-current="false"])',
            )
            const drift = Math.max(
              Math.abs(knobBox.left - segmentBox.left),
              Math.abs(knobBox.right - segmentBox.right),
            )
            if (isOwn && drift <= 1) continue
            reported.add(knob)
            out.push({
              rule: 'overlap',
              target: name(knob.parentElement ?? knob),
              detail: isOwn
                ? `бегунок не совпадает с выбранным сегментом на ${Math.round(drift)}px`
                : `бегунок заходит на ${Math.round(depth)}px на сегмент ${name(segment)}`,
            })
            continue
          }
          reported.add(first)
          reported.add(second)
          out.push({
            rule: 'overlap',
            target: name(knob ? (knob.parentElement ?? knob) : first),
            detail:
              `${knob ? 'бегунок' : ''} налезает на ${Math.round(depth)}px на ${name(knob ? segment : second)} в ${name(holder)}`.trim(),
          })
        }
      }
    }

    return out
  }, scope ?? null)

// Fails with every defect at once, named by rule, so the report says what to fix; soft, so one
// test reports every screen it walks through.
const expectGoodDesign = async (page: Page, scope?: string) => {
  // A sheet still sliding in is half transparent and scaled: judge what settles on screen.
  // Scroll-driven animations (edge fades) and endless ones never end, so they are not waited for.
  await page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.playState !== 'running' ||
              !(animation.timeline instanceof DocumentTimeline) ||
              animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY,
          ),
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => undefined)
  const findings = await findDesignDefects(page, scope)
  expect
    .soft(findings.map((item) => `${RULE_TITLES[item.rule]}: ${item.target}, ${item.detail}`))
    .toEqual([])
}

export type { DesignFinding, DesignRule }
export { expectGoodDesign, findDesignDefects }
