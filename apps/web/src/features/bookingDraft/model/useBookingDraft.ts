'use client'

import { useSyncExternalStore } from 'react'
import { type BookingDraft, readDraft, subscribeToDraft } from '../lib/bookingDraft'

let cachedRaw: string | null = null
let cachedDraft: BookingDraft | null = null

// useSyncExternalStore needs a stable snapshot between reads.
const getSnapshot = () => {
  const draft = readDraft()
  const raw = draft ? JSON.stringify(draft) : null
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedDraft = draft
  }

  return cachedDraft
}

/** The half-made booking kept on this device, or null. */
export const useBookingDraft = () => useSyncExternalStore(subscribeToDraft, getSnapshot, () => null)
