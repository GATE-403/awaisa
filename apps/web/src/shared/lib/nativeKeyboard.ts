import { getNativeApp, onNativeMessage, postToNative } from './nativeBridge'

type NativeKeyboard = { height: number; duration: number }

// An app without a duration (before keyboard-controller) told the page only once the keyboard was
// up; a short glide then.
const FALLBACK_DURATION_MS = 250

const isAndroidApp = () => getNativeApp()?.platform === 'android'

// Everything on the page that moves itself for the keyboard holds `overlay` (the booking sheet, a
// search floating at the foot); the WebView goes back to `resize` only when the last lets go, so
// two of them never undo each other.
let holders = 0

/** Asks the Android app to leave the WebView whole for the keyboard; returns the release. Outside
 *  the Android app it does nothing. */
const holdKeyboardOverlay = () => {
  if (!isAndroidApp()) return () => {}
  holders += 1
  if (holders === 1) postToNative({ type: 'keyboardMode', mode: 'overlay' })
  let isHeld = true
  return () => {
    if (!isHeld) return
    isHeld = false
    holders -= 1
    if (holders === 0) postToNative({ type: 'keyboardMode', mode: 'resize' })
  }
}

/** The keyboard as the Android app reports it; returns the unsubscribe. */
const onNativeKeyboard = (listener: (keyboard: NativeKeyboard) => void) =>
  onNativeMessage((message) => {
    if (message.type !== 'keyboard') return
    listener({ height: message.height, duration: message.duration ?? FALLBACK_DURATION_MS })
  })

export type { NativeKeyboard }
export { holdKeyboardOverlay, isAndroidApp, onNativeKeyboard }
