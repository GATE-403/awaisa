type NativeMessage = { type: 'openExternal'; url: string }

const isNativeMessage = (value: unknown): value is NativeMessage =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === 'openExternal' &&
  'url' in value &&
  typeof value.url === 'string'

const parseNativeMessage = (data: string): NativeMessage | null => {
  try {
    const value: unknown = JSON.parse(data)
    return isNativeMessage(value) ? value : null
  } catch {
    return null
  }
}

export type { NativeMessage }
export { parseNativeMessage }
