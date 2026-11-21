type HapticStyle = 'success' | 'warning' | 'error' | 'selection' | 'impact'

// Web → native; mirrored in apps/mobile `src/common/utils/nativeBridge.ts`, change both together.
// `pushStatus` asks without a prompt, `pushEnable` may show the system's prompt.
type NativeMessage =
  | { type: 'openExternal'; url: string }
  | { type: 'haptic'; style: HapticStyle }
  | { type: 'pushStatus' }
  | { type: 'pushEnable' }

type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable'

// Native → web, as an `awaisa:native` window event: the answer to both push messages.
type WebMessage = { type: 'pushState'; permission: PushPermission; token: string | null }

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

const isWebMessage = (value: unknown): value is WebMessage =>
  typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'pushState'

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
  new Promise<WebMessage | null>((resolve) => {
    const timer = window.setTimeout(() => finish(null), NATIVE_ANSWER_MS)
    const stop = onNativeMessage((message) => finish(message))
    const finish = (message: WebMessage | null) => {
      window.clearTimeout(timer)
      stop()
      resolve(message)
    }
    if (!postToNative({ type })) finish(null)
  })

export type { HapticStyle, NativeApp, NativeMessage, PushPermission, WebMessage }
export { askNativePush, getNativeApp, haptic, onNativeMessage, postToNative }
