import { CLIENT_API_PREFIX } from '@/config/api'
import { toApiError } from './apiError'
import type { Availability, Booking, CreateBookingInput, CreatedBooking } from './types'

const TOKEN_HEADER = 'x-booking-token'

const request = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(`${CLIENT_API_PREFIX}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw await toApiError(response)

  return response.json()
}

const getAvailability = (
  params: { serviceId: string; specialistId: string; date: string },
  signal?: AbortSignal,
) => request<Availability>(`/availability?${new URLSearchParams(params)}`, { signal })

const createBooking = (input: CreateBookingInput) =>
  request<CreatedBooking>('/bookings', { method: 'POST', body: JSON.stringify(input) })

const getBooking = (id: string, token: string, signal?: AbortSignal) =>
  request<Booking>(`/bookings/${id}`, { headers: { [TOKEN_HEADER]: token }, signal })

const cancelBooking = (id: string, token: string) =>
  request<Booking>(`/bookings/${id}`, { method: 'DELETE', headers: { [TOKEN_HEADER]: token } })

export { cancelBooking, createBooking, getAvailability, getBooking }
