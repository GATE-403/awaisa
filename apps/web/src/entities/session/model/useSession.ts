'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
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

// The server read the session for this page: its answer seeds the store, so the page renders
// signed-in (or as a guest) straight away and skips the browser's /api/me round trip.
const InitialSession = createContext<SessionState | null>(null)

const toState = (customer: Customer | null): SessionState =>
  customer ? { status: 'signedIn', customer } : GUEST

// Browser only: on the server this module is shared by every request.
const seedSession = (initial: SessionState) => {
  if (typeof window !== 'undefined' && state.status === 'loading') state = initial
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

const useSession = () => {
  const initial = useContext(InitialSession)
  if (initial) seedSession(initial)
  const session = useSyncExternalStore(
    subscribe,
    () => state,
    () => initial ?? LOADING,
  )

  return { ...session, setCustomer, refreshSession, signOut }
}

export { InitialSession, toState, useSession }
export type { SessionState }
