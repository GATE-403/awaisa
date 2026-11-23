type HapticStyle = 'success' | 'warning' | 'error' | 'selection' | 'impact'

// How the app meets the keyboard: `resize` shrinks the WebView above it (the default), `overlay`
// leaves it whole and sends the keyboard's height (the booking sheet makes room itself).
type KeyboardMode = 'resize' | 'overlay'

// Web → native; mirrored in apps/mobile `src/common/utils/nativeBridge.ts`, change both together.
// `pushStatus` asks without a prompt, `pushEnable` may show the system's prompt.
type NativeMessage =
  | { type: 'openExternal'; url: string }
  | { type: 'haptic'; style: HapticStyle }
  | { type: 'pushStatus' }
  | { type: 'pushEnable' }
  | { type: 'keyboardMode'; mode: KeyboardMode }

type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable'

// Native → web, as an `awaisa:native` window event: the answer to both push messages, and on
// Android the keyboard's height in CSS pixels as it shows (0 when it hides).
type PushStateMessage = { type: 'pushState'; permission: PushPermission; token: string | null }
type KeyboardMessage = { type: 'keyboard'; height: number }
type WebMessage = PushStateMessage | KeyboardMessage

const WEB_EVENT = 'awaisa:native'

type NativeApp = {
  platform: 'ios' | 'android'
  version: string | null
}

declare global {
  interface Window {
    __NATIVE_APP__?: NativeApp
    ReactNativeWebView?: { postMessage: (message: string) => void }
  }
}

const getNativeApp = (): NativeApp | null => {
  if (typeof window === 'undefined') return null

  return window.__NATIVE_APP__ ?? null
}

const postToNative = (message: NativeMessage): boolean => {
  if (typeof window === 'undefined' || !window.ReactNativeWebView) return false

  window.ReactNativeWebView.postMessage(JSON.stringify(message))
  return true
}

// Taptic feedback in the app; the web has no equivalent worth faking, so it is a no-op there.
const haptic = (style: HapticStyle) => {
  postToNative({ type: 'haptic', style })
}

const isWebMessage = (value: unknown): value is WebMessage => {
  if (typeof value !== 'object' || value === null) return false
  const message = value as { type?: unknown; height?: unknown }
  if (message.type === 'keyboard') return typeof message.height === 'number'

  return message.type === 'pushState'
}

/** Listens to what the app sends the page; returns the unsubscribe. */
const onNativeMessage = (listener: (message: WebMessage) => void) => {
  const handle = (event: Event) => {
    const detail: unknown = (event as CustomEvent).detail
    if (isWebMessage(detail)) listener(detail)
  }
  window.addEventListener(WEB_EVENT, handle)

  return () => window.removeEventListener(WEB_EVENT, handle)
}

// The app's answer to one push question; an app too old to know the message never answers.
const NATIVE_ANSWER_MS = 30_000

const askNativePush = (type: 'pushStatus' | 'pushEnable') =>
  new Promise<PushStateMessage | null>((resolve) => {
    const timer = window.setTimeout(() => finish(null), NATIVE_ANSWER_MS)
    const stop = onNativeMessage((message) => {
      if (message.type === 'pushState') finish(message)
    })
    const finish = (message: PushStateMessage | null) => {
      window.clearTimeout(timer)
      stop()
      resolve(message)
    }
    if (!postToNative({ type })) finish(null)
  })

export type {
  HapticStyle,
  KeyboardMessage,
  KeyboardMode,
  NativeApp,
  NativeMessage,
  PushPermission,
  PushStateMessage,
  WebMessage,
}
export { askNativePush, getNativeApp, haptic, onNativeMessage, postToNative }
