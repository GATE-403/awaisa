import { useToast } from '@awaisa/ui/Toast'
import { useLingui } from '@lingui/react/macro'
import { useEffect, useRef, useState } from 'react'
import {
  forgetBooking,
  parseBookings,
  readRaw,
  updateSnapshot,
  useStoredBookings,
} from '@/entities/booking'
import { useSession } from '@/entities/session'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import {
  cancelBooking,
  cancelMyBooking,
  getBooking,
  getMyBookings,
  restoreBooking,
  restoreMyBooking,
} from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackStep, trackToastAction } from '@/shared/lib/telemetry'

const NOT_FOUND_STATUS = 404

// Slightly shorter than the API's 15-second undo window.
const UNDO_TIMEOUT_MS = 12_000

// `initial` is what the server already read for this account; the first fetch is skipped then.
export const useMyBookings = (initial: Booking[] | null = null) => {
  const { bookings: stored, isReady: isStorageReady } = useStoredBookings()
  const session = useSession()
  const [accountBookings, setAccountBookings] = useState<Booking[] | null>(initial)
  const hasInitial = useRef(initial !== null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const toast = useToast()
  const { t } = useLingui()
  const idsKey = stored.map((booking) => booking.id).join(',')
  const isSignedIn = session.status === 'signedIn'
  const accountIds = new Set(accountBookings?.map((booking) => booking.id))
  const bookings = [
    ...(accountBookings ?? []),
    ...stored.filter((item) => !accountIds.has(item.id)).map((item) => item.snapshot),
  ].sort((first, second) => second.startsAt.localeCompare(first.startsAt))
  const isReady =
    isStorageReady &&
    session.status !== 'loading' &&
    (session.status === 'guest' || accountBookings !== null)

  useEffect(() => {
    if (!isSignedIn) {
      setAccountBookings(null)
      return
    }
    if (hasInitial.current) {
      hasInitial.current = false
      return
    }

    const controller = new AbortController()
    getMyBookings(controller.signal)
      .then(setAccountBookings)
      .catch(() => {
        if (!controller.signal.aborted) setAccountBookings([])
      })

    return () => controller.abort()
  }, [isSignedIn])

  useEffect(() => {
    if (!idsKey) return

    const controller = new AbortController()

    for (const { id, token } of parseBookings(readRaw())) {
      getBooking(id, token, controller.signal)
        .then(updateSnapshot)
        .catch((requestError: unknown) => {
          if (requestError instanceof ApiError && requestError.status === NOT_FOUND_STATUS) {
            forgetBooking(id)
          }
        })
    }

    return () => controller.abort()
  }, [idsKey])

  const cancel = async (id: string) => {
    const local = stored.find((item) => item.id === id)
    if (!local && !accountIds.has(id)) return

    setCancellingId(id)

    try {
      const cancelled = accountIds.has(id)
        ? await cancelMyBooking(id)
        : await cancelBooking(id, local?.token ?? '')
      if (local) updateSnapshot(cancelled)
      setAccountBookings(
        (current) => current?.map((item) => (item.id === id ? cancelled : item)) ?? null,
      )
      haptic('warning')
      trackStep('cancel', cancelled.business.slug)
      toast.show({
        title: t`Booking cancelled`,
        description: t`The time is free for others now`,
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: {
          label: t`Undo`,
          onClick: () => {
            trackToastAction('undo_cancel')
            void restore(id)
          },
        },
      })
    } catch (cancelError) {
      toast.show({
        title: t`Could not cancel`,
        description: getErrorMessage(cancelError),
        type: 'error',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const restore = async (id: string) => {
    const local = stored.find((item) => item.id === id)

    try {
      const restored = accountIds.has(id)
        ? await restoreMyBooking(id)
        : await restoreBooking(id, local?.token ?? '')
      if (local) updateSnapshot(restored)
      setAccountBookings(
        (current) => current?.map((item) => (item.id === id ? restored : item)) ?? null,
      )
      trackStep('cancel_undone', restored.business.slug)
      toast.show({ title: t`Booking restored`, type: 'success' })
    } catch (restoreError) {
      toast.show({
        title: t`Could not restore`,
        description: getErrorMessage(restoreError),
        type: 'error',
      })
    }
  }

  // After the client moved a visit: the new time replaces the old one everywhere.
  const replace = (moved: Booking) => {
    if (stored.some((item) => item.id === moved.id)) updateSnapshot(moved)
    setAccountBookings(
      (current) => current?.map((item) => (item.id === moved.id ? moved : item)) ?? null,
    )
  }

  const forget = (id: string) => {
    forgetBooking(id)
    toast.show({ title: t`Removed from the list` })
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.show({ title: t`Number copied`, description: code, type: 'success' })
    } catch {
      toast.show({ title: t`Could not copy`, type: 'error' })
    }
  }

  return {
    bookings,
    isReady,
    isSignedIn,
    phone: session.customer?.phone ?? null,
    canForget: (id: string) => stored.some((item) => item.id === id),
    cancellingId,
    cancel,
    replace,
    forget,
    copyCode,
  }
}
