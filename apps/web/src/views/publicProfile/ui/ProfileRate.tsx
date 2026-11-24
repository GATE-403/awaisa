'use client'

import { useEffect, useState } from 'react'
import { RateRecent } from '@/features/rateVisit'
import { getMyBookings } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'

interface ProfileRateProps {
  /** A review was left: the profile's count of visits waiting goes down. */
  onRated: () => void
}

// «Waiting for a rating» answered right here on one's own profile: the latest visit without a review, its
// stars one tap away (the same «How did it go?» as in the records), then the next one.
export const ProfileRate = ({ onRated }: ProfileRateProps) => {
  const today = useToday()
  const [past, setPast] = useState<Booking[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getMyBookings(controller.signal)
      .then((bookings) => {
        const now = Date.now()
        setPast(bookings.filter((booking) => Date.parse(booking.startsAt) < now))
      })
      .catch(() => setPast([]))
    return () => controller.abort()
  }, [])

  if (!past) return null

  return (
    <RateRecent
      history={past}
      today={today}
      onRated={(rated) => {
        setPast((list) => (list ?? []).map((item) => (item.id === rated.id ? rated : item)))
        onRated()
      }}
    />
  )
}
