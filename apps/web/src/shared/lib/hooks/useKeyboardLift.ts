'use client'

import { type RefObject, useEffect } from 'react'
import {
  holdKeyboardOverlay,
  isAndroidApp,
  onNativeKeyboard,
  rememberedKeyboardHeight,
  rememberKeyboardHeight,
} from '../nativeKeyboard'

const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea'
// Up before the WebView reports the keyboard (about 170ms after the focus on a Samsung A55).
const LIFT_MS = 120
// No keyboard by then (a hardware one, or none came): the bar goes back down.
const NO_KEYBOARD_MS = 700
// The keyboard may never say it hid (an app that sends nothing): the WebView is given back anyway.
const RELEASE_MS = 1000
// A visual viewport this much shorter than the window has a keyboard under it.
const KEYBOARD_MIN = 120

// A bar fixed at the window's foot with a text field in it (the cabinet's searches, the team's
// number): in the Android app it rides up on the keyboard itself. While its field has focus the
// WebView keeps its size (`overlay`): resizing it laid the whole page out again under the sliding
// keyboard. The bar rises as soon as the field takes focus, by the last keyboard's height: the
// WebView shrinks its visual viewport for the keyboard about 170ms later, and a field still under
// it then made the browser pan the whole page up by the keyboard's height (measured on a Samsung
// A55; a bar that rose with the keyboard got there too late). The height is then set from the
// visual viewport or the app, whichever comes first. Its CSS moves it by transform alone
// (`--keyboard-inset`, `--keyboard-duration`, `data-keyboard`). Elsewhere nothing happens:
// browsers and the iOS app already lift fixed bars over the keyboard.
export const useKeyboardLift = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const bar = ref.current
    if (!bar || !isAndroidApp()) return
    const viewport = window.visualViewport
    let release: (() => void) | null = null
    let timer = 0
    let check = 0
    let isKeyboardSeen = false

    const lift = (height: number, duration: number) => {
      bar.style.setProperty('--keyboard-inset', `${height}px`)
      bar.style.setProperty('--keyboard-duration', `${duration}ms`)
      bar.toggleAttribute('data-keyboard', height > 0)
    }

    const letGo = () => {
      window.clearTimeout(timer)
      window.clearTimeout(check)
      release?.()
      release = null
      bar.removeAttribute('data-keyboard')
    }

    const keyboardCame = (height: number) => {
      isKeyboardSeen = true
      rememberKeyboardHeight(height)
      lift(height, LIFT_MS)
    }

    const keyboardWent = (duration: number) => {
      lift(0, duration)
      // Down again: the WebView may resize again.
      if (!bar.contains(document.activeElement)) letGo()
    }

    const stopNative = onNativeKeyboard(({ height, duration }) => {
      if (!release) return
      if (height > 0) keyboardCame(height)
      else keyboardWent(duration)
    })

    const handleViewport = () => {
      if (!release || !viewport) return
      const covered = Math.round(innerHeight - viewport.height)
      if (covered > KEYBOARD_MIN) keyboardCame(covered)
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(TEXT_FIELDS)) return
      window.clearTimeout(timer)
      if (release) return
      release = holdKeyboardOverlay()
      isKeyboardSeen = false
      lift(rememberedKeyboardHeight(), LIFT_MS)
      check = window.setTimeout(() => {
        if (!isKeyboardSeen) lift(0, LIFT_MS)
      }, NO_KEYBOARD_MS)
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
    viewport?.addEventListener('resize', handleViewport)
    return () => {
      stopNative()
      bar.removeEventListener('focusin', handleFocusIn)
      bar.removeEventListener('focusout', handleFocusOut)
      viewport?.removeEventListener('resize', handleViewport)
      letGo()
      bar.style.removeProperty('--keyboard-inset')
      bar.style.removeProperty('--keyboard-duration')
    }
  }, [ref])
}
