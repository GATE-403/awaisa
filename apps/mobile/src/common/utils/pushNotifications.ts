import Constants from 'expo-constants'
import { isDevice } from 'expo-device'
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  IosAuthorizationStatus,
  type NotificationPermissionsStatus,
  type NotificationResponse,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications'
import { Platform } from 'react-native'
import type { PushPermission, WebMessage } from './nativeBridge'

// The channel the API names in every push (`EXPO_CHANNEL_ID` in apps/api `expo-push.ts`).
const CHANNEL_ID = 'bookings'

// The app is open: a booking notice still shows as a banner, like the cabinet's own toast would.
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const getProjectId = (): string | null =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null

// iOS keeps its own answer in `ios.status` (provisional counts as yes); Android has only `status`.
const toPermission = (status: NotificationPermissionsStatus): PushPermission => {
  const iosStatus = status.ios?.status
  if (status.granted || iosStatus === IosAuthorizationStatus.PROVISIONAL) return 'granted'
  return status.status === 'denied' && !status.canAskAgain ? 'denied' : 'undetermined'
}

const ensureChannel = async () => {
  if (Platform.OS !== 'android') return
  // Android 13+ shows the permission prompt only once a channel exists.
  await setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Записи',
    importance: AndroidImportance.HIGH,
  })
}

const readToken = async (projectId: string) => (await getExpoPushTokenAsync({ projectId })).data

/**
 * Where the app's pushes stand. Simulators and builds without an EAS project cannot get a token,
 * so the page hears `unavailable` and hides the switch. Only `shouldAsk` shows the system prompt.
 */
const getPushState = async (shouldAsk: boolean): Promise<WebMessage> => {
  const projectId = getProjectId()
  if (!isDevice || !projectId) return { type: 'pushState', permission: 'unavailable', token: null }
  try {
    await ensureChannel()
    const current = await getPermissionsAsync()
    const status = !current.granted && shouldAsk ? await requestPermissionsAsync() : current
    const permission = toPermission(status)
    const token = permission === 'granted' ? await readToken(projectId) : null

    return { type: 'pushState', permission, token }
  } catch {
    return { type: 'pushState', permission: 'unavailable', token: null }
  }
}

// The API puts the screen to open in `data.url` (a path on the site, `/manage/…` or `/master/…`).
const getNotificationPath = (response: NotificationResponse | null | undefined): string | null => {
  const url = response?.notification.request.content.data?.url
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return null

  return url
}

export { getNotificationPath, getPushState }
