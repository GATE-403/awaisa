'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { getMyProfileSettings, getProfile, updateMyProfileSettings } from '@/shared/api/clientApi'
import type { ProfileSettings, PublicProfile } from '@/shared/api/types'

type State = { settings: ProfileSettings | null; profile: PublicProfile | null }

// One shared copy for the account card and the settings: the look the client chose and their
// public profile (level, badges), loaded once and updated after saving.
let state: State = { settings: null, profile: null }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

const emit = (next: State) => {
  state = next
  for (const listener of listeners) listener()
}

const load = () => {
  loading ??= getMyProfileSettings()
    .then(async (settings) => {
      emit({ ...state, settings })
      emit({ settings, profile: await getProfile(settings.id) })
    })
    .catch(() => {
      loading = null
    })
  return loading
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const EMPTY: State = { settings: null, profile: null }

/** The signed-in client's profile look and public profile; nothing for guests. */
export const useMyProfile = (isSignedIn: boolean) => {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  )

  useEffect(() => {
    if (isSignedIn) void load()
  }, [isSignedIn])

  const save = async (input: Parameters<typeof updateMyProfileSettings>[0]) => {
    const settings = await updateMyProfileSettings(input)
    emit({ ...state, settings })
    emit({ settings, profile: await getProfile(settings.id) })
  }

  return { ...current, save }
}
