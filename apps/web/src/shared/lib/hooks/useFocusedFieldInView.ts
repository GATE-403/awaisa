'use client'

import { type RefObject, useEffect } from 'react'
import { holdKeyboardOverlay, isAndroidApp, onNativeKeyboard } from '../nativeKeyboard'

const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
const KEYBOARD_MS = 900
const SETTLE_MS = 150

// The last keyboard seen, so the next field moves before the keyboard is up: its height in CSS
// pixels and whether it shrank the window (Android, the app's WebView) or only the visual viewport
// (iOS, where it covers the fixed bottom bar).
const keyboard = {
  height: 0,
  resizesWindow: !/iP(hone|ad|od)/.test(globalThis.navigator?.userAgent ?? ''),
}

// A fixed layer that scrolls inside itself (the booking sheet): a phone's keyboard slides over it
// without resizing the page, and a field focused by the form («Booking for someone else», the
// name after a time is picked) stayed under the keyboard. When a text field in the layer takes
// focus, once the keyboard is up (the visual viewport has settled), the layer is scrolled just
// enough to set the field above the keyboard and below the layer's top bar. Both
// edges come from the layer itself (its box and its `scroll-padding`), not from the window: the
// sheet starts below the window's top, and on a Samsung, whose browser shrinks the page for the
// keyboard, a field set 72px from the window's top went under the sheet's bar.
export const useFocusedFieldInView = (ref: RefObject<HTMLElement | null>, { gap = 16 } = {}) => {
  useEffect(() => {
    const layer = ref.current
    if (!layer) return
    let field: HTMLElement | null = null
    let timer = 0
    let settle = 0
    const viewport = window.visualViewport
    // A keyboard is up when it covers the page (the visual viewport is short) or shrank the window
    // (Android, the app's WebView) below the tallest it has been.
    let tallest = innerHeight
    // The Android app's keyboard as the app reports it (`overlay`): the WebView keeps its size, so
    // neither the window nor the visual viewport says the keyboard is there.
    let nativeInset = 0
    const isKeyboardUp = () =>
      nativeInset > 0 ||
      (viewport ? viewport.height < innerHeight - 120 : false) ||
      innerHeight < tallest - 120
    // While it is up the sheet keeps only its bottom bar's real height clear (`data-keyboard`,
    // BookingPage.module.css), not the bar's tall fade: with the fade's 144px a field in plain
    // view counted as hidden and the WebView jumped it to the middle (115px from «Name» to
    // «Phone»).
    const handleResize = () => {
      tallest = Math.max(tallest, innerHeight)
      layer.toggleAttribute('data-keyboard', isKeyboardUp())
    }

    const reveal = (behavior: ScrollBehavior = 'instant') => {
      if (!field || document.activeElement !== field) return
      const box = field.getBoundingClientRect()
      const layerBox = layer.getBoundingClientRect()
      const style = getComputedStyle(layer)
      const topRoom = Number.parseFloat(style.scrollPaddingTop) || gap
      const visibleTop = Math.max(layerBox.top, viewport?.offsetTop ?? 0) + topRoom
      // With the keyboard up the layer's fixed bottom bar is behind it; without one (a hardware
      // keyboard) the bar covers the foot, which the layer's own scroll padding already measures.
      const isCovered = nativeInset > 0 || (viewport ? viewport.height < innerHeight - 120 : false)
      const footRoom = isCovered ? gap : Number.parseFloat(style.scrollPaddingBottom) || gap
      const viewBottom = viewport ? viewport.offsetTop + viewport.height : innerHeight
      const visibleBottom = Math.min(layerBox.bottom, viewBottom - nativeInset) - footRoom
      const below = box.bottom - visibleBottom
      const above = visibleTop - box.top
      // Instant while the viewport moves (stacked smooth scrolls overshot); a glide when the
      // keyboard is already up and only the field changed (a jump of 110px from «Name» to «Phone»).
      if (below > 0) layer.scrollBy({ top: Math.min(below, -above), behavior })
      else if (above > 0) layer.scrollBy({ top: -above, behavior })
    }

    // As the keyboard starts to slide in, the sheet glides so the field ends above where the
    // keyboard (and, where the window shrinks, the bottom bar over it) will be: when the window is
    // then resized, the field is already in view and the WebView does not jump it to the middle
    // (163px at once on a Samsung A55: tapping a field scrolled the sheet).
    let startHeight = 0
    const glideAhead = () => {
      if (!field) return
      if (isKeyboardUp() || !matchMedia('(pointer: coarse)').matches) return
      const box = field.getBoundingClientRect()
      const layerBox = layer.getBoundingClientRect()
      const style = getComputedStyle(layer)
      const height = keyboard.height || Math.round(innerHeight * 0.42)
      const footRoom = keyboard.resizesWindow
        ? Number.parseFloat(style.scrollPaddingBottom) || gap
        : gap
      const visibleTop = layerBox.top + (Number.parseFloat(style.scrollPaddingTop) || gap)
      const visibleBottom = Math.min(layerBox.bottom, innerHeight - height) - footRoom
      const below = box.bottom - visibleBottom
      if (below <= 0) return
      layer.scrollBy({ top: Math.min(below, box.top - visibleTop), behavior: 'smooth' })
    }

    // Remembers the keyboard once it is up, for the next field.
    const learnKeyboard = () => {
      const shrunk = startHeight - innerHeight
      const covered = viewport ? innerHeight - viewport.height : 0
      if (shrunk > 120) Object.assign(keyboard, { height: shrunk, resizesWindow: true })
      else if (covered > 120) Object.assign(keyboard, { height: covered, resizesWindow: false })
    }

    // Once the viewport has stopped changing: while a WebView is resized for the keyboard (the
    // Android app), the visual viewport passes through a false height (118px of 459) for a frame,
    // and following it scrolled the sheet 231px in one jump.
    const revealWhenSettled = () => {
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        learnKeyboard()
        reveal()
      }, SETTLE_MS)
    }

    const stop = () => {
      window.clearTimeout(timer)
      window.clearTimeout(settle)
      viewport?.removeEventListener('resize', revealWhenSettled)
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || !target.matches(TEXT_FIELDS)) return
      stop()
      field = target
      startHeight = innerHeight
      glideAhead()
      // Now for a keyboard that is already up, then once it is in.
      window.setTimeout(() => {
        if (isKeyboardUp()) reveal('smooth')
      }, 50)
      viewport?.addEventListener('resize', revealWhenSettled)
      // The last look waits for the viewport to settle too, then the listening ends.
      timer = window.setTimeout(() => {
        viewport?.removeEventListener('resize', revealWhenSettled)
        revealWhenSettled()
      }, KEYBOARD_MS)
    }

    // In the Android app the sheet takes the keyboard itself: the app leaves the WebView whole
    // (resizing it laid the long page under the sheet out again while the keyboard slid in, and
    // the frame rate dropped) and sends the keyboard's height as it shows and hides. An app too
    // old to know `overlay` keeps resizing and sends nothing: everything above still works.
    // It hears of the keyboard as it starts to slide in, with its final height, so the sheet glides
    // along with it.
    const release = holdKeyboardOverlay()
    const applyInset = (height: number) => {
      nativeInset = height
      layer.style.setProperty('--keyboard-inset', `${height}px`)
      layer.toggleAttribute('data-keyboard', height > 0)
    }
    const stopNative = isAndroidApp()
      ? onNativeKeyboard(({ height }) => {
          applyInset(height)
          if (height <= 0) return
          Object.assign(keyboard, { height, resizesWindow: false })
          reveal('smooth')
        })
      : null
    // The app may never say the keyboard went (it went with the app to the background, measured on
    // a Samsung A55): the sheet kept 341px of room under it. With no text field in focus a moment
    // after the caret left, or on coming back, there is no keyboard.
    let staleTimer = 0
    const dropStaleInset = () => {
      window.clearTimeout(staleTimer)
      staleTimer = window.setTimeout(() => {
        if (nativeInset > 0 && !document.activeElement?.matches(TEXT_FIELDS)) applyInset(0)
      }, KEYBOARD_MS)
    }
    if (stopNative) {
      layer.addEventListener('focusout', dropStaleInset)
      document.addEventListener('visibilitychange', dropStaleInset)
    }

    layer.addEventListener('focusin', handleFocusIn)
    window.addEventListener('resize', handleResize)
    viewport?.addEventListener('resize', handleResize)
    return () => {
      stopNative?.()
      window.clearTimeout(staleTimer)
      layer.removeEventListener('focusout', dropStaleInset)
      document.removeEventListener('visibilitychange', dropStaleInset)
      release()
      layer.style.removeProperty('--keyboard-inset')
      layer.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('resize', handleResize)
      viewport?.removeEventListener('resize', handleResize)
      layer.removeAttribute('data-keyboard')
      stop()
    }
  }, [ref, gap])
}
