import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useRef, useState } from 'react'
import { getRecentBookings } from '@/common/api/clientApi'
import type { AdminBooking } from '@/common/api/types'
import { playChime } from '@/common/utils/chime'
import { formatDayLong } from '@/features/booking/bookingUtils'

const POLL_MS = 20_000

// Bookings made from this tab (staff booking a walk-in) should not alert their own author.
const ownBookingIds = new Set<string>()

const markOwnBooking = (id: string) => ownBookingIds.add(id)

const describe = (booking: AdminBooking) =>
  `${booking.customerName} · ${formatDayLong(booking.date)}, ${booking.time} · ${booking.serviceName}`

// While the cabinet is open, new client bookings arrive as a toast, a chime and — when the tab is
// in the background and the owner allowed it — a system notification.
export const useNewBookingAlerts = (slug: string, isEnabled: boolean) => {
  const toast = useToast()
  const sinceRef = useRef<string | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: the toast manager is stable
  useEffect(() => {
    if (!isEnabled) return

    sinceRef.current ??= new Date().toISOString()
    let controller: AbortController | null = null

    const poll = async () => {
      controller = new AbortController()
      try {
        const fresh = await getRecentBookings(slug, sinceRef.current ?? '', controller.signal)
        const last = fresh.at(-1)
        if (last) sinceRef.current = last.createdAt
        const foreign = fresh.filter((booking) => !ownBookingIds.has(booking.id))
        if (foreign.length === 0) return

        playChime()
        setVersion((value) => value + 1)
        for (const booking of foreign) {
          toast.show({ title: 'Новая запись', description: describe(booking), type: 'info' })
          if (
            document.hidden &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('Новая запись', { body: describe(booking), tag: booking.id })
          }
        }
      } catch {
        // Offline or signed out: try again on the next tick.
      }
    }

    const timer = window.setInterval(poll, POLL_MS)

    return () => {
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [slug, isEnabled])

  return version
}

export { markOwnBooking }
