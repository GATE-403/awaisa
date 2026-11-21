type HapticStyle = 'success' | 'warning' | 'error' | 'selection' | 'impact'

// Web → native. `pushStatus` asks without a prompt, `pushEnable` may show the system's prompt.
type NativeMessage =
  | { type: 'openExternal'; url: string }
  | { type: 'haptic'; style: HapticStyle }
  | { type: 'pushStatus' }
  | { type: 'pushEnable' }

type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable'

// Native → web, delivered as a `awaisa:native` window event: the answer to both push messages.
// `token` is the Expo push token once the permission is granted, else null.
type WebMessage = { type: 'pushState'; permission: PushPermission; token: string | null }

// The window event the page listens to (`apps/web/src/shared/lib/nativeBridge.ts`).
const WEB_EVENT = 'awaisa:native'

const HAPTIC_STYLES: HapticStyle[] = ['success', 'warning', 'error', 'selection', 'impact']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNativeMessage = (value: unknown): value is NativeMessage => {
  if (!isRecord(value)) return false
  if (value.type === 'openExternal') return typeof value.url === 'string'
  if (value.type === 'haptic') return HAPTIC_STYLES.includes(value.style as HapticStyle)
  if (value.type === 'pushStatus' || value.type === 'pushEnable') return true

  return false
}

const parseNativeMessage = (data: string): NativeMessage | null => {
  try {
    const value: unknown = JSON.parse(data)
    return isNativeMessage(value) ? value : null
  } catch {
    return null
  }
}

// A script for `injectJavaScript` that hands the page one message; JSON is a valid JS literal.
const toWebScript = (message: WebMessage) =>
  `window.dispatchEvent(new CustomEvent(${JSON.stringify(WEB_EVENT)}, { detail: ${JSON.stringify(message)} })); true;`

export type { HapticStyle, NativeMessage, PushPermission, WebMessage }
export { parseNativeMessage, toWebScript }
