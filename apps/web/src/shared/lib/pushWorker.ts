// The service worker that shows Web Push notices (`public/sw.js`).
const PUSH_WORKER_URL = '/sw.js'

// A notice with this tag (a booking id) is already on screen, shown by a push.
const isAlreadyNotified = async (tag: string) => {
  if (!('serviceWorker' in navigator)) return false
  const registration = await navigator.serviceWorker.getRegistration(PUSH_WORKER_URL)
  const shown = await registration?.getNotifications({ tag })

  return (shown?.length ?? 0) > 0
}

export { isAlreadyNotified, PUSH_WORKER_URL }
