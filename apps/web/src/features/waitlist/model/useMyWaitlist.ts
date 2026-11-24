'use client'

import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import {
  getMyWaitlist,
  getWaitlistEntry,
  leaveMyWaitlist,
  leaveWaitlist,
} from '@/shared/api/clientApi'
import type { WaitlistEntry } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import {
  forgetWaitlistEntry,
  readStoredWaitlist,
  updateWaitlistSnapshot,
  useStoredWaitlist,
} from './waitlistStorage'

const NOT_FOUND = 404

// Entries from this device and, when signed in, the account - still waiting or just notified.
export const useMyWaitlist = () => {
  const stored = useStoredWaitlist()
  const session = useSession()
  const today = useToday()
  const toast = useToast()
  const [account, setAccount] = useState<WaitlistEntry[]>([])
  const isSignedIn = session.status === 'signedIn'
  const idsKey = stored.map((item) => item.id).join(',')
  const byId = new Map<string, WaitlistEntry>()
  for (const entry of account) byId.set(entry.id, entry)
  for (const item of stored) if (!byId.has(item.id)) byId.set(item.id, item.snapshot)
  const entries = [...byId.values()]
    .filter(
      (entry) =>
        (entry.status === 'waiting' || entry.status === 'notified') &&
        (!today || entry.date >= today.dayKey),
    )
    .sort((first, second) => first.date.localeCompare(second.date))

  useEffect(() => {
    if (!isSignedIn) {
      setAccount([])
      return
    }
    const controller = new AbortController()
    getMyWaitlist(controller.signal)
      .then(setAccount)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isSignedIn])

  // Device entries refresh their status: an SMS may have gone out since.
  useEffect(() => {
    if (!idsKey) return
    const controller = new AbortController()
    for (const { id, token } of readStoredWaitlist()) {
      getWaitlistEntry(id, token, controller.signal)
        .then(updateWaitlistSnapshot)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === NOT_FOUND) forgetWaitlistEntry(id)
        })
    }
    return () => controller.abort()
  }, [idsKey])

  const leave = async (id: string) => {
    const local = stored.find((item) => item.id === id)
    try {
      if (local) await leaveWaitlist(id, local.token)
      else await leaveMyWaitlist(id)
      forgetWaitlistEntry(id)
      setAccount((current) => current.filter((entry) => entry.id !== id))
      toast.show({ title: 'Больше не ждём', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return { entries, leave }
}
