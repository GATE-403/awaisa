// Web Push for owners, administrators and masters: a booking notice arrives even with the cabinet
// closed. No caching here: the service worker exists only to show pushes and open them.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const readMessage = (event) => {
  try {
    return event.data ? event.data.json() : null
  } catch {
    return null
  }
}

self.addEventListener('push', (event) => {
  const message = readMessage(event)
  if (!message) return
  // The tag is the booking id: the open cabinet's own notice for the same booking is replaced,
  // so it never shows twice.
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      data: { url: message.url },
      icon: '/apple-icon',
      badge: '/icon.svg',
      lang: 'ru',
    }),
  )
})

// A tap opens that day: an open tab of the site is focused and taken there, else a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin)
  if (url.origin !== self.location.origin) return

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const sameSite = windows.filter((client) => new URL(client.url).origin === url.origin)
      const target =
        sameSite.find((client) => new URL(client.url).pathname === url.pathname) ?? sameSite[0]
      // `navigate` works only on tabs this worker controls; any other tab gets a new window.
      const moved = target ? await target.navigate(url.href).catch(() => null) : null
      if (moved) {
        await moved.focus()
        return
      }
      await self.clients.openWindow(url.href)
    })(),
  )
})
