'use client'

import { useSyncExternalStore } from 'react'
import { getMe, logout as logoutRequest } from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'

type SessionState =
  | { status: 'loading'; customer: null }
  | { status: 'guest'; customer: null }
  | { status: 'signedIn'; customer: Customer }

const LOADING: SessionState = { status: 'loading', customer: null }
const GUEST: SessionState = { status: 'guest', customer: null }

let state: SessionState = LOADING
let request: Promise<void> | null = null
const listeners = new Set<() => void>()

const setState = (next: SessionState) => {
  state = next
  for (const listener of listeners) listener()
}

const setCustomer = (customer: Customer | null) =>
  setState(customer ? { status: 'signedIn', customer } : GUEST)

const refreshSession = () => {
  request ??= getMe()
    .then(setCustomer)
    .catch(() => setState(GUEST))
    .finally(() => {
      request = null
    })

  return request
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (state.status === 'loading') void refreshSession()

  return () => listeners.delete(listener)
}

const signOut = async () => {
  await logoutRequest().catch(() => undefined)
  setCustomer(null)
}

export const useSession = () => {
  const session = useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  )

  return { ...session, setCustomer, refreshSession, signOut }
}
