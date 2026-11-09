import { useToast } from '@awaisa/ui/Toast'
import { useCallback, useEffect, useState } from 'react'
import { getErrorMessage } from '@/common/api/apiError'
import {
  cancelBookingAsSalon,
  createStaffBooking,
  createTimeOff,
  deleteTimeOff,
  getAdminSchedule,
  moveBookingAsSalon,
  restoreBookingAsSalon,
} from '@/common/api/clientApi'
import type {
  AdminBooking,
  AdminSchedule,
  CreateBookingInput,
  CreateTimeOffInput,
} from '@/common/api/types'
import { haptic } from '@/common/utils/nativeBridge'
import { pluralize } from '@/common/utils/plural'
import { markOwnBooking } from './useNewBookingAlerts'

// Slightly shorter than the API's 15-second undo window.
const UNDO_TIMEOUT_MS = 12_000

export const useAdminSchedule = (slug: string, date: string | null, refreshKey = 0) => {
  const toast = useToast()
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
        title: 'Не получилось',
        description: getErrorMessage(actionError),
        type: 'error',
      })
      return false
    }
  }

  const restore = async (id: string) => {
    try {
      await restoreBookingAsSalon(slug, id)
      toast.show({ title: 'Запись возвращена', type: 'success' })
    } catch (restoreError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(restoreError),
        type: 'error',
      })
    }
    reload()
  }

  // Cancelling is immediate and reversible: the toast offers «Вернуть» before the client is texted.
  const cancelBooking = async (id: string) => {
    try {
      await cancelBookingAsSalon(slug, id)
      toast.show({
        title: 'Запись отменена',
        description: 'Клиенту уйдёт SMS через 15 секунд',
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: { label: 'Вернуть', onClick: () => void restore(id) },
      })
      reload()
      return true
    } catch (cancelError) {
      toast.show({
        title: 'Не получилось',
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
      return `${booking.customerName} записан(а) на ${booking.time}, клиенту ушло SMS`
    })

  const moveBooking = async (booking: AdminBooking, specialistId: string, time: string) => {
    if (!date) return
    try {
      const moved = await moveBookingAsSalon(slug, booking.id, { date, time, specialistId })
      haptic('success')
      toast.show({
        title: `Перенесено на ${moved.time}`,
        description: `${moved.customerName} · ${moved.specialistName}. Клиенту уйдёт SMS через 15 секунд`,
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: {
          label: 'Вернуть',
          onClick: () =>
            void runAction(async () => {
              await moveBookingAsSalon(slug, booking.id, moved.previous)
              return 'Запись на прежнем месте'
            }),
        },
      })
    } catch (moveError) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(moveError), type: 'error' })
    }
    reload()
  }

  const addTimeOff = (input: CreateTimeOffInput) =>
    runAction(async () => {
      const { conflictingBookingIds } = await createTimeOff(slug, input)
      if (conflictingBookingIds.length === 0) return 'Время закрыто'

      return `Время закрыто. В нём ${pluralize(conflictingBookingIds.length, ['запись', 'записи', 'записей'])} — отмените или перенесите`
    })

  const removeTimeOff = (id: string) =>
    runAction(async () => {
      await deleteTimeOff(slug, id)
      return 'Время снова открыто'
    })

  return {
    schedule,
    error,
    reload,
    addBooking,
    moveBooking,
    cancelBooking,
    addTimeOff,
    removeTimeOff,
  }
}
