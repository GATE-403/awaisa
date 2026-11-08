import { useSyncExternalStore } from 'react'
import { parseBookings, readRaw, subscribeToBookings } from '@/common/utils/bookingStorage'

const getServerSnapshot = () => undefined

export const useStoredBookings = () => {
  const raw = useSyncExternalStore(subscribeToBookings, readRaw, getServerSnapshot)

  return { bookings: parseBookings(raw ?? null), isReady: raw !== undefined }
}
