type NativeMessage = { type: 'openExternal'; url: string }

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

export type { NativeApp, NativeMessage }
export { getNativeApp, postToNative }
