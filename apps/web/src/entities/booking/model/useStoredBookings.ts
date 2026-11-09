'use client'

import { useSyncExternalStore } from 'react'
import { parseBookings, readRaw, subscribeToBookings } from '@/entities/booking/lib/bookingStorage'

const getServerSnapshot = () => undefined

export const useStoredBookings = () => {
  const raw = useSyncExternalStore(subscribeToBookings, readRaw, getServerSnapshot)

  return { bookings: parseBookings(raw ?? null), isReady: raw !== undefined }
}
