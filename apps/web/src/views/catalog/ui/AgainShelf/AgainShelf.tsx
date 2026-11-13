'use client'

import { useEffect, useState } from 'react'
import { useStoredBookings } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getMyBookings } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { AgainCard } from './AgainCard'
import styles from './AgainShelf.module.css'

const MAX_ITEMS = 3

// The masters this client has been to, newest first: one tap books the same service again.
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

// «Снова к мастеру» on the catalog: for returning clients only — nothing renders for new ones.
export const AgainShelf = () => {
  const { bookings: stored } = useStoredBookings()
  const session = useSession()
  const [account, setAccount] = useState<Booking[]>([])
  const [now, setNow] = useState<number | null>(null)
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    const controller = new AbortController()
    getMyBookings(controller.signal)
      .then(setAccount)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isSignedIn])

  if (now === null) return null
  const byId = new Map<string, Booking>()
  for (const booking of account) byId.set(booking.id, booking)
  for (const { snapshot } of stored) if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot)
  const items = pickRecent([...byId.values()], now)
  if (items.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby='again-title'>
      <div className={styles.head}>
        <h2 id='again-title' className={styles.title}>
          Снова к мастеру
        </h2>
        <p className={styles.subtitle}>Туда же и к тому же мастеру — в один тап</p>
      </div>
      <ul className={styles.list}>
        {items.map((booking) => (
          <li key={booking.id}>
            <AgainCard booking={booking} />
          </li>
        ))}
      </ul>
    </section>
  )
}
