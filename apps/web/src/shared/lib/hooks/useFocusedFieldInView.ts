'use client'

import { type RefObject, useEffect } from 'react'

const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
const KEYBOARD_MS = 900

// A fixed layer that scrolls inside itself (the booking sheet): a phone's keyboard slides over it
// without resizing the page, and a field focused by the form («Записываю другого человека», the
// name after a time is picked) stayed under the keyboard. When a text field in the layer takes
// focus, for as long as the keyboard is coming up (the visual viewport shrinks), the layer is
// scrolled just enough to set the field above the keyboard and below the layer's top bar. Both
// edges come from the layer itself (its box and its `scroll-padding`), not from the window: the
// sheet starts below the window's top, and on a Samsung, whose browser shrinks the page for the
// keyboard, a field set 72px from the window's top went under the sheet's bar.
export const useFocusedFieldInView = (ref: RefObject<HTMLElement | null>, { gap = 16 } = {}) => {
  useEffect(() => {
    const layer = ref.current
    if (!layer) return
    let field: HTMLElement | null = null
    let timer = 0
    const viewport = window.visualViewport

    const reveal = () => {
      if (!field || document.activeElement !== field) return
      const box = field.getBoundingClientRect()
      const layerBox = layer.getBoundingClientRect()
      const style = getComputedStyle(layer)
      const topRoom = Number.parseFloat(style.scrollPaddingTop) || gap
      const visibleTop = Math.max(layerBox.top, viewport?.offsetTop ?? 0) + topRoom
      // With the keyboard up the layer's fixed bottom bar is behind it; without one (a hardware
      // keyboard) the bar covers the foot, which the layer's own scroll padding already measures.
      const isKeyboardUp = viewport ? viewport.height < innerHeight - 120 : false
      const footRoom = isKeyboardUp ? gap : Number.parseFloat(style.scrollPaddingBottom) || gap
      const visibleBottom =
        Math.min(layerBox.bottom, viewport ? viewport.offsetTop + viewport.height : innerHeight) -
        footRoom
      const below = box.bottom - visibleBottom
      const above = visibleTop - box.top
      // Instant: it follows the keyboard as it slides in, and stacked smooth scrolls overshot.
      if (below > 0) layer.scrollBy({ top: Math.min(below, -above) })
      else if (above > 0) layer.scrollBy({ top: -above })
    }

    const stop = () => {
      window.clearTimeout(timer)
      viewport?.removeEventListener('resize', reveal)
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.matches(TEXT_FIELDS)) return
      stop()
      field = target
      // Now for a keyboard that is already up, then as it slides in.
      window.setTimeout(reveal, 50)
      viewport?.addEventListener('resize', reveal)
      timer = window.setTimeout(() => {
        reveal()
        stop()
      }, KEYBOARD_MS)
    }

    layer.addEventListener('focusin', handleFocusIn)
    return () => {
      layer.removeEventListener('focusin', handleFocusIn)
      stop()
    }
  }, [ref, gap])
}
