import { useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import { cancelBooking, getBooking } from '@/common/api/clientApi'
import { useStoredBookings } from '@/common/hooks/useStoredBookings'
import {
  forgetBooking,
  parseBookings,
  readRaw,
  updateSnapshot,
} from '@/common/utils/bookingStorage'

const NOT_FOUND_STATUS = 404

export const useMyBookings = () => {
  const { bookings, isReady } = useStoredBookings()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idsKey = bookings.map((booking) => booking.id).join(',')

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
    const booking = bookings.find((item) => item.id === id)
    if (!booking) return

    setCancellingId(id)
    setError(null)

    try {
      updateSnapshot(await cancelBooking(id, booking.token))
    } catch (cancelError) {
      setError(getErrorMessage(cancelError))
    } finally {
      setCancellingId(null)
    }
  }

  return {
    bookings: bookings.map((booking) => booking.snapshot),
    isReady,
    cancellingId,
    error,
    cancel,
    forget: forgetBooking,
  }
}
