import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import {
  cancelBooking,
  cancelMyBooking,
  getBooking,
  getMyBookings,
  restoreBooking,
  restoreMyBooking,
} from '@/common/api/clientApi'
import type { Booking } from '@/common/api/types'
import { useSession } from '@/common/hooks/useSession'
import { useStoredBookings } from '@/common/hooks/useStoredBookings'
import {
  forgetBooking,
  parseBookings,
  readRaw,
  updateSnapshot,
} from '@/common/utils/bookingStorage'
import { haptic } from '@/common/utils/nativeBridge'

const NOT_FOUND_STATUS = 404

// Slightly shorter than the API's 15-second undo window.
const UNDO_TIMEOUT_MS = 12_000

export const useMyBookings = () => {
  const { bookings: stored, isReady: isStorageReady } = useStoredBookings()
  const session = useSession()
  const [accountBookings, setAccountBookings] = useState<Booking[] | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const toast = useToast()
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
      toast.show({
        title: 'Запись отменена',
        description: 'Время освободилось для других',
        type: 'success',
        timeout: UNDO_TIMEOUT_MS,
        action: { label: 'Вернуть', onClick: () => void restore(id) },
      })
    } catch (cancelError) {
      toast.show({
        title: 'Не удалось отменить',
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
      toast.show({ title: 'Запись возвращена', type: 'success' })
    } catch (restoreError) {
      toast.show({
        title: 'Не удалось вернуть',
        description: getErrorMessage(restoreError),
        type: 'error',
      })
    }
  }

  const forget = (id: string) => {
    forgetBooking(id)
    toast.show({ title: 'Убрано из списка' })
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.show({ title: 'Номер скопирован', description: code, type: 'success' })
    } catch {
      toast.show({ title: 'Не удалось скопировать', type: 'error' })
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
    forget,
    copyCode,
  }
}
