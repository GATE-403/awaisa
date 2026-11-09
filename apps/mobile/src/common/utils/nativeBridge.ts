type HapticStyle = 'success' | 'warning' | 'error' | 'selection' | 'impact'

type NativeMessage = { type: 'openExternal'; url: string } | { type: 'haptic'; style: HapticStyle }

const HAPTIC_STYLES: HapticStyle[] = ['success', 'warning', 'error', 'selection', 'impact']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNativeMessage = (value: unknown): value is NativeMessage => {
  if (!isRecord(value)) return false
  if (value.type === 'openExternal') return typeof value.url === 'string'
  if (value.type === 'haptic') return HAPTIC_STYLES.includes(value.style as HapticStyle)

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

export type { HapticStyle, NativeMessage }
export { parseNativeMessage }
