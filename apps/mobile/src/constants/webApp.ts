import Constants from 'expo-constants'
import { Platform } from 'react-native'

const DEV_WEB_PORT = 3000

const getWebUrl = (): string => {
  if (process.env.EXPO_PUBLIC_WEB_URL) return process.env.EXPO_PUBLIC_WEB_URL

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
  return `http://${devHost}:${DEV_WEB_PORT}`
}

const WEB_URL = getWebUrl()
const WEB_ORIGIN = new URL(WEB_URL).origin

const NATIVE_APP_SCRIPT = `window.__NATIVE_APP__ = ${JSON.stringify({
  platform: Platform.OS,
  version: Constants.expoConfig?.version ?? null,
})}; true;`

export { NATIVE_APP_SCRIPT, WEB_ORIGIN, WEB_URL }
