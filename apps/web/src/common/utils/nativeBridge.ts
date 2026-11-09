type HapticStyle = 'success' | 'warning' | 'error' | 'selection' | 'impact'

type NativeMessage = { type: 'openExternal'; url: string } | { type: 'haptic'; style: HapticStyle }

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

export type { HapticStyle, NativeApp, NativeMessage }
export { getNativeApp, haptic, postToNative }
