'use client'

import { type RefObject, useEffect } from 'react'
import { holdKeyboardOverlay, isAndroidApp, onNativeKeyboard } from '../nativeKeyboard'

const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
// The keyboard may never say it hid (an app that sends nothing): the WebView is given back anyway.
const RELEASE_MS = 1000

// A bar fixed at the window's foot with a text field in it (the cabinet's searches, the team's
// number): in the Android app it rides up on the keyboard itself. While its field has focus the
// WebView keeps its size (`overlay`): resizing it laid the whole page out again under the sliding
// keyboard. The bar gets the keyboard's height (`--keyboard-inset`), its animation's length
// (`--keyboard-duration`) and `data-keyboard`, and its CSS moves it by transform alone. Elsewhere
// nothing happens: browsers and the iOS app already lift fixed bars over the keyboard.
export const useKeyboardLift = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const bar = ref.current
    if (!bar || !isAndroidApp()) return
    let release: (() => void) | null = null
    let timer = 0

    const letGo = () => {
      window.clearTimeout(timer)
      release?.()
      release = null
      bar.removeAttribute('data-keyboard')
    }

    const stopNative = onNativeKeyboard(({ height, duration }) => {
      if (!release) return
      bar.style.setProperty('--keyboard-inset', `${height}px`)
      bar.style.setProperty('--keyboard-duration', `${duration}ms`)
      bar.toggleAttribute('data-keyboard', height > 0)
      // Hidden, the bar is back down: the WebView may resize again.
      if (height <= 0 && !bar.contains(document.activeElement)) letGo()
    })

    const handleFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(TEXT_FIELDS)) return
      window.clearTimeout(timer)
      release ??= holdKeyboardOverlay()
    }

    // Kept until the keyboard has gone: going back to `resize` while it slides away would shrink
    // and grow the WebView once more.
    const handleFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && bar.contains(event.relatedTarget)) return
      window.clearTimeout(timer)
      timer = window.setTimeout(letGo, RELEASE_MS)
    }

    bar.addEventListener('focusin', handleFocusIn)
    bar.addEventListener('focusout', handleFocusOut)
    return () => {
      stopNative()
      bar.removeEventListener('focusin', handleFocusIn)
      bar.removeEventListener('focusout', handleFocusOut)
      letGo()
      bar.style.removeProperty('--keyboard-inset')
      bar.style.removeProperty('--keyboard-duration')
    }
  }, [ref])
}
