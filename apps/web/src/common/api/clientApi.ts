import { CLIENT_API_PREFIX } from '@/config/api'
import { toApiError } from './apiError'
import type {
  AdminBooking,
  AdminSchedule,
  Availability,
  Booking,
  Business,
  BusinessCard,
  BusinessLink,
  BusinessPage,
  Category,
  CreateBookingInput,
  CreateBusinessInput,
  CreatedBooking,
  CreatedTimeOff,
  CreateTimeOffInput,
  Customer,
  OtpRequest,
  ServiceInput,
  SlugCheck,
  SpecialistInput,
  UpdateBusinessInput,
  WorkingDay,
} from './types'

const TOKEN_HEADER = 'x-booking-token'

const NO_CONTENT = 204

const request = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  const response = await fetch(`${CLIENT_API_PREFIX}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw await toApiError(response)
  if (response.status === NO_CONTENT) return undefined as Result

  return response.json()
}

const post = <Result>(path: string, body?: unknown) =>
  request<Result>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const getAvailability = (
  params: { serviceId: string; specialistId: string; date: string },
  signal?: AbortSignal,
) => request<Availability>(`/availability?${new URLSearchParams(params)}`, { signal })

const createBooking = (input: CreateBookingInput) => post<CreatedBooking>('/bookings', input)

const getBooking = (id: string, token: string, signal?: AbortSignal) =>
  request<Booking>(`/bookings/${id}`, { headers: { [TOKEN_HEADER]: token }, signal })

const cancelBooking = (id: string, token: string) =>
  request<Booking>(`/bookings/${id}`, { method: 'DELETE', headers: { [TOKEN_HEADER]: token } })

const requestOtp = (phone: string, channel: 'auto' | 'sms' = 'auto') =>
  post<OtpRequest>('/auth/otp', { phone, channel })

const verifyOtp = (phone: string, code: string) => post<Customer>('/auth/verify', { phone, code })

const logout = () => post<void>('/auth/logout')

const getMe = (signal?: AbortSignal) => request<Customer>('/me', { signal })

const updateMe = (name: string) =>
  request<Customer>('/me', { method: 'PATCH', body: JSON.stringify({ name }) })

const getMyBookings = (signal?: AbortSignal) => request<Booking[]>('/me/bookings', { signal })

const cancelMyBooking = (id: string) => request<Booking>(`/me/bookings/${id}`, { method: 'DELETE' })

const send = <Result>(method: 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  request<Result>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

const manage = (slug: string) => `/manage/${encodeURIComponent(slug)}`

const searchBusinesses = (query: string, signal?: AbortSignal) =>
  request<BusinessCard[]>(`/businesses?${new URLSearchParams({ q: query })}`, { signal })

const getMyBusinesses = (signal?: AbortSignal) =>
  request<BusinessLink[]>('/me/businesses', { signal })

const checkSlug = (slug: string, signal?: AbortSignal) =>
  request<SlugCheck>(`/businesses/slug-available?${new URLSearchParams({ slug })}`, { signal })

const createBusiness = (input: CreateBusinessInput) => post<Business>('/businesses', input)

const getManagedBusiness = (slug: string, signal?: AbortSignal) =>
  request<BusinessPage>(manage(slug), { signal })

const updateBusiness = (slug: string, input: UpdateBusinessInput) =>
  send<Business>('PATCH', manage(slug), input)

const setWorkingHours = (slug: string, days: WorkingDay[]) =>
  send<Business>('PUT', `${manage(slug)}/hours`, days)

const createCategory = (slug: string, name: string) =>
  post<Category>(`${manage(slug)}/categories`, { name })

const renameCategory = (slug: string, id: string, name: string) =>
  send<void>('PATCH', `${manage(slug)}/categories/${id}`, { name })

const deleteCategory = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/categories/${id}`)

const createService = (slug: string, input: ServiceInput) =>
  post<{ id: string }>(`${manage(slug)}/services`, input)

const updateService = (slug: string, id: string, input: ServiceInput) =>
  send<void>('PUT', `${manage(slug)}/services/${id}`, input)

const createSpecialist = (slug: string, input: SpecialistInput) =>
  post<{ id: string }>(`${manage(slug)}/specialists`, input)

const updateSpecialist = (slug: string, id: string, input: SpecialistInput) =>
  send<void>('PUT', `${manage(slug)}/specialists/${id}`, input)

const getAdminSchedule = (slug: string, date: string, signal?: AbortSignal) =>
  request<AdminSchedule>(`${manage(slug)}/schedule?${new URLSearchParams({ date })}`, { signal })

const cancelBookingAsSalon = (slug: string, id: string) =>
  post<AdminBooking>(`${manage(slug)}/bookings/${id}/cancel`)

const createTimeOff = (slug: string, input: CreateTimeOffInput) =>
  post<CreatedTimeOff>(`${manage(slug)}/time-off`, input)

const deleteTimeOff = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/time-off/${id}`)

export {
  cancelBooking,
  cancelBookingAsSalon,
  cancelMyBooking,
  checkSlug,
  createBooking,
  createBusiness,
  createCategory,
  createService,
  createSpecialist,
  createTimeOff,
  deleteCategory,
  deleteTimeOff,
  getAdminSchedule,
  getAvailability,
  getBooking,
  getManagedBusiness,
  getMe,
  getMyBookings,
  getMyBusinesses,
  renameCategory,
  searchBusinesses,
  setWorkingHours,
  updateBusiness,
  updateService,
  updateSpecialist,
  logout,
  requestOtp,
  updateMe,
  verifyOtp,
}
