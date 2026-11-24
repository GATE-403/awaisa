'use client'

import { useToast } from '@awaisa/ui/Toast'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import { getRecentBookings } from '@/shared/api/clientApi'
import type { AdminBooking } from '@/shared/api/types'
import type { Format } from '@/shared/i18n'
import { useRouter } from '@/shared/i18n/navigation'
import { useFormat } from '@/shared/i18n/useFormat'
import { playChime } from '@/shared/lib/chime'
import { isAlreadyNotified } from '@/shared/lib/pushWorker'

const POLL_MS = 20_000

// Bookings made from this tab (staff booking a walk-in) should not alert their own author.
const ownBookingIds = new Set<string>()

const markOwnBooking = (id: string) => ownBookingIds.add(id)

const describe = (booking: AdminBooking, format: Format) =>
  `${booking.customerName} · ${format.dayLong(booking.date)}, ${booking.time} · ${booking.serviceName}`

// While the cabinet is open, new client bookings arrive as a toast, a chime and - when the tab is
// in the background and the owner allowed it - a system notification.
export const useNewBookingAlerts = (slug: string, isEnabled: boolean) => {
  const { t } = useLingui()
  const format = useFormat()
  const toast = useToast()
  const router = useRouter()
  const sinceRef = useRef<string | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: the toast manager and router are stable
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
          // Toast or system notification: a tap opens that day with the booking's card.
          const open = () =>
            router.push(`/manage/${slug}?tab=schedule&date=${booking.date}&booking=${booking.id}`, {
              scroll: false,
            })
          toast.show({
            title: t`New booking`,
            description: describe(booking, format),
            type: 'info',
            onOpen: open,
          })
          const canNotify =
            document.hidden && 'Notification' in window && Notification.permission === 'granted'
          // A push has already shown this booking (the same tag): one notice is enough.
          const isShown = canNotify && (await isAlreadyNotified(booking.id).catch(() => false))
          if (canNotify && !isShown) {
            const notification = new Notification(t`New booking`, {
              body: describe(booking, format),
              tag: booking.id,
            })
            notification.onclick = () => {
              window.focus()
              open()
              notification.close()
            }
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
