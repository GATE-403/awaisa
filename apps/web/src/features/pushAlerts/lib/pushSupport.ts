// What this browser can do about Web Push. iPhone and iPad get pushes only from the site added to
// the home screen (iOS 16.4+), so in Safari itself the answer is «install first», not «no».

type PushSupport = 'supported' | 'install' | 'unsupported'

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const getPushSupport = (): PushSupport => {
  const canPush =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (canPush) return 'supported'
  if (isIos() && !isInstalled()) return 'install'

  return 'unsupported'
}

// The VAPID key comes as base64url; `subscribe` wants the raw bytes.
const keyToBytes = (key: string) => {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  const raw = window.atob(base64)

  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export type { PushSupport }
export { getPushSupport, keyToBytes }
