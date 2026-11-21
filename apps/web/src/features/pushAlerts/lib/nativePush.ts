import { askNativePush, type PushPermission } from '@/shared/lib/nativeBridge'

// The person's own «on» in the app: the system permission alone does not say they still want
// pushes after turning the switch off (the app cannot take its permission back).
const NATIVE_PUSH_KEY = 'awaisa:native-push:v1'

const readIsWanted = () => {
  try {
    return window.localStorage.getItem(NATIVE_PUSH_KEY) === 'on'
  } catch {
    return false
  }
}

const writeIsWanted = (isWanted: boolean) => {
  try {
    if (isWanted) window.localStorage.setItem(NATIVE_PUSH_KEY, 'on')
    else window.localStorage.removeItem(NATIVE_PUSH_KEY)
  } catch {
    // Private storage off: the switch simply reads «off» next time.
  }
}

type NativePush = { permission: PushPermission; token: string | null }

// What the app says about its pushes; an app too old to answer counts as unable.
const readNativePush = async (shouldAsk: boolean): Promise<NativePush> => {
  const answer = await askNativePush(shouldAsk ? 'pushEnable' : 'pushStatus')

  return answer ?? { permission: 'unavailable', token: null }
}

export type { NativePush }
export { readIsWanted, readNativePush, writeIsWanted }
