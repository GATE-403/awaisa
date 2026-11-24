'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useSession } from '@/entities/session'
import { followMaster, listFollows, unfollowMaster } from '@/shared/api/clientApi'
import type { FollowedMaster } from '@/shared/api/types'

type FollowsState = { status: 'idle' | 'loading' | 'ready'; items: FollowedMaster[] }

const IDLE: FollowsState = { status: 'idle', items: [] }

// One copy for the page: every follow button and «My specialists» read the same list.
let state = IDLE
const listeners = new Set<() => void>()

const setState = (next: FollowsState) => {
  state = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const load = async () => {
  if (state.status !== 'idle') return
  setState({ status: 'loading', items: [] })
  try {
    setState({ status: 'ready', items: await listFollows() })
  } catch {
    setState(IDLE)
  }
}

/** The masters the signed-in client follows; guests follow no one (the button asks to sign in). */
const useFollows = () => {
  const session = useSession()
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  )
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    if (isSignedIn) void load()
    else if (session.status === 'guest' && state !== IDLE) setState(IDLE)
  }, [isSignedIn, session.status])

  const follow = async (specialistId: string, notifyWorks?: boolean) =>
    setState({ status: 'ready', items: await followMaster(specialistId, notifyWorks) })

  const unfollow = async (specialistId: string) =>
    setState({ status: 'ready', items: await unfollowMaster(specialistId) })

  return {
    isSignedIn,
    isReady: current.status === 'ready',
    items: current.items,
    isFollowing: (specialistId: string) => current.items.some((item) => item.id === specialistId),
    follow,
    unfollow,
  }
}

export { useFollows }
