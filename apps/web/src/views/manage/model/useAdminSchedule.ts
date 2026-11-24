import { useToast } from '@awaisa/ui/Toast'
import { useCallback, useEffect, useState } from 'react'
import { markOwnBooking } from '@/features/bookingAlerts'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  cancelBookingAsSalon,
  createStaffBooking,
  createTimeOff,
  deleteTimeOff,
  getAdminSchedule,
  moveBookingAsSalon,
  restoreBookingAsSalon,
  setBookingOutcome,
} from '@/shared/api/clientApi'
import type {
  AdminBooking,
  AdminSchedule,
  CreateBookingInput,
  CreateTimeOffInput,
  OutcomeInput,
} from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackToastAction } from '@/shared/lib/telemetry'

// Slightly shorter than the API's 15-second undo window.
const UNDO_TIMEOUT_MS = 12_000

export const useAdminSchedule = (slug: string, date: string | null, refreshKey = 0) => {
  const toast = useToast()
  const t = useT()
  const [schedule, setSchedule] = useState<AdminSchedule | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the reload trigger
  useEffect(() => {
    if (!date) return

    const controller = new AbortController()
    setError(null)
    getAdminSchedule(slug, date, controller.signal)
      .then(setSchedule)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(requestError))
      })

    return () => controller.abort()
  }, [slug, date, version, refreshKey])

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  const runAction = async (action: () => Promise<string>) => {
    try {
      toast.show({ title: await action(), type: 'success' })
      haptic('success')
      reload()
      return true
    } catch (actionError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(actionError),
        type: 'error',
      })
      return false
    }
  }

  const restore = async (id: string) => {
    try {
      await restoreBookingAsSalon(slug, id)
      toast.show({ title: t('Booking restored'), type: 'success' })
    } catch (restoreError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(restoreError),
        type: 'error',
      })
    }
    reload()
  }

  // Cancelling is immediate and reversible: the toast offers "Undo" before the client is texted.
  const cancelBooking = async (id: string) => {
    try {
      await cancelBookingAsSalon(slug, id)
      toast.show({
        title: t('Booking cancelled'),
        description: t('The client gets an SMS in 15 seconds'),
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: {
          label: t('Undo'),
          onClick: () => {
            trackToastAction('staff_undo_cancel')
            void restore(id)
          },
        },
      })
      reload()
      return true
    } catch (cancelError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(cancelError),
        type: 'error',
      })
      return false
    }
  }

  const addBooking = (input: CreateBookingInput) =>
    runAction(async () => {
      const booking = await createStaffBooking(slug, input)
      markOwnBooking(booking.id)
      return t('{name} is booked for {time}, the client got an SMS', {
        name: booking.customerName,
        time: booking.time,
      })
    })

  const moveBooking = async (booking: AdminBooking, specialistId: string, time: string) => {
    if (!date) return
    try {
      const moved = await moveBookingAsSalon(slug, booking.id, { date, time, specialistId })
      haptic('success')
      toast.show({
        title: t('Moved to {time}', { time: moved.time }),
        description: t('{name} · {master}. The client gets an SMS in 15 seconds', {
          name: moved.customerName,
          master: moved.specialistName,
        }),
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: {
          label: t('Undo'),
          onClick: () =>
            void runAction(async () => {
              trackToastAction('staff_undo_move')
              await moveBookingAsSalon(slug, booking.id, moved.previous)
              return t('The booking is back in place')
            }),
        },
      })
    } catch (moveError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(moveError),
        type: 'error',
      })
    }
    reload()
  }

  const addTimeOff = (input: CreateTimeOffInput) =>
    runAction(async () => {
      const { conflictingBookingIds } = await createTimeOff(slug, input)
      if (conflictingBookingIds.length === 0) return t('Time blocked')

      return t('Time blocked. It has {count}: cancel or move them', {
        count: t.count(conflictingBookingIds.length, ['booking', 'bookings']),
      })
    })

  // Marking a visit is quiet (a tick, no toast): staff do it many times a day.
  const markOutcome = async (id: string, input: OutcomeInput) => {
    try {
      const updated = await setBookingOutcome(slug, id, input)
      haptic('selection')
      setSchedule((current) =>
        current
          ? {
              ...current,
              bookings: current.bookings.map((item) => (item.id === id ? updated : item)),
            }
          : current,
      )
      return updated
    } catch (outcomeError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(outcomeError),
        type: 'error',
      })
      return null
    }
  }

  const removeTimeOff = (id: string) =>
    runAction(async () => {
      await deleteTimeOff(slug, id)
      return t('Time open again')
    })

  return {
    schedule,
    error,
    reload,
    addBooking,
    moveBooking,
    cancelBooking,
    markOutcome,
    addTimeOff,
    removeTimeOff,
  }
}
