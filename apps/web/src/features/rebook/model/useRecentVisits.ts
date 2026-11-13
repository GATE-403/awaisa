'use client'

import { useEffect, useState } from 'react'
import { useStoredBookings } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getMyBookings } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'

const MAX_ITEMS = 3

// The masters this client has been to, newest first, one per place, service and master.
const pickRecent = (bookings: Booking[], now: number) => {
  const seen = new Set<string>()
  const recent: Booking[] = []
  const past = bookings
    .filter(
      (booking) =>
        booking.status === 'confirmed' &&
        new Date(booking.startsAt).getTime() < now &&
        booking.payment?.status !== 'expired',
    )
    .sort((first, second) => second.startsAt.localeCompare(first.startsAt))
  for (const booking of past) {
    const key = `${booking.business.slug}|${booking.serviceId}|${booking.specialistId}`
    if (seen.has(key)) continue
    seen.add(key)
    recent.push(booking)
    if (recent.length === MAX_ITEMS) break
  }
  return recent
}

/** Recent visits from this device and the account; empty for new clients. */
export const useRecentVisits = (isEnabled = true) => {
  const { bookings: stored } = useStoredBookings()
  const session = useSession()
  const [account, setAccount] = useState<Booking[]>([])
  const [now, setNow] = useState<number | null>(null)
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!isSignedIn || !isEnabled) return
    const controller = new AbortController()
    getMyBookings(controller.signal)
      .then(setAccount)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isSignedIn, isEnabled])

  if (now === null) return []
  const byId = new Map<string, Booking>()
  for (const booking of account) byId.set(booking.id, booking)
  for (const { snapshot } of stored) if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot)
  return pickRecent([...byId.values()], now)
}
