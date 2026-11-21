'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { deletePushSubscription, getPushConfig, savePushSubscription } from '@/shared/api/clientApi'
import type { PushSubscriptionInput } from '@/shared/api/types'
import { PUSH_WORKER_URL } from '@/shared/lib/pushWorker'
import { getPushSupport, keyToBytes } from '../lib/pushSupport'

/**
 * `checking` until the browser and the server have answered; `unsupported` hides everything;
 * `install` is iPhone Safari (add to the home screen first); `denied` was refused in the browser.
 */
type PushState = 'checking' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'

// One state for the page: the bell over the schedule and the Settings row agree.
let state: PushState = 'checking'
let publicKey: string | null = null
let checking: Promise<void> | null = null
const listeners = new Set<() => void>()

const setState = (next: PushState) => {
  state = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const toInput = (subscription: PushSubscription): PushSubscriptionInput => {
  const json = subscription.toJSON()
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  }
}

const check = async () => {
  const support = getPushSupport()
  if (support !== 'supported') return setState(support)
  const config = await getPushConfig().catch(() => null)
  if (!config?.isAvailable || !config.publicKey) return setState('unsupported')
  publicKey = config.publicKey
  if (Notification.permission === 'denied') return setState('denied')
  const registration = await navigator.serviceWorker.getRegistration(PUSH_WORKER_URL)
  const existing = await registration?.pushManager.getSubscription()
  if (!existing) return setState('off')
  // The browser may have been signed in as someone else since: the row follows whoever is here.
  await savePushSubscription(toInput(existing)).catch(() => undefined)
  setState('on')
}

const ensureChecked = () => {
  checking ??= check().catch(() => setState('unsupported'))
  return checking
}

/**
 * Asks for permission only here, on the person's own tap: the browser's prompt first (Safari
 * wants it inside the gesture), then the worker and the subscription.
 */
const enablePush = async () => {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    setState(permission === 'denied' ? 'denied' : 'off')
    return false
  }
  if (!publicKey) return false
  const registration = await navigator.serviceWorker.register(PUSH_WORKER_URL)
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(publicKey),
    }))
  await savePushSubscription(toInput(subscription))
  setState('on')
  return true
}

const disablePush = async () => {
  const registration = await navigator.serviceWorker.getRegistration(PUSH_WORKER_URL)
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await deletePushSubscription(subscription.endpoint).catch(() => undefined)
    await subscription.unsubscribe()
  }
  setState('off')
}

const usePushAlerts = () => {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => 'checking' as const,
  )

  useEffect(() => {
    void ensureChecked()
  }, [])

  return { state: current, enable: enablePush, disable: disablePush }
}

export type { PushState }
export { usePushAlerts }
