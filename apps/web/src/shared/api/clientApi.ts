import { CLIENT_API_PREFIX } from '@/shared/config/api'
import { toApiError } from './apiError'
import type {
  AdminBooking,
  AdminSchedule,
  AnalyticsDays,
  AnalyticsReport,
  Availability,
  Booking,
  Branch,
  BranchInput,
  Business,
  BusinessCard,
  BusinessLink,
  BusinessPage,
  Category,
  ClientCard,
  ClientListItem,
  CreateBookingInput,
  CreateBusinessInput,
  CreatedBooking,
  CreatedTimeOff,
  CreateTimeOffInput,
  Customer,
  ManagedReview,
  MapPlace,
  MasterSchedule,
  MovedBooking,
  NextFree,
  OtpRequest,
  OutcomeInput,
  RecentBooking,
  Review,
  ReviewAccess,
  ReviewSummary,
  ServiceInput,
  SlugCheck,
  SpecialistInput,
  TelegramStatus,
  UpdateBusinessInput,
  VisitReview,
  WorkingDay,
} from './types'

const TOKEN_HEADER = 'x-booking-token'

const SIGNATURE_HEADER = 'x-review-signature'

const NO_CONTENT = 204

const request = async <Result>(path: string, init?: RequestInit): Promise<Result> => {
  // FormData sets its own multipart boundary.
  const isForm = init?.body instanceof FormData
  const response = await fetch(`${CLIENT_API_PREFIX}${path}`, {
    ...init,
    headers: isForm ? init?.headers : { 'content-type': 'application/json', ...init?.headers },
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
  {
    branchId,
    ...params
  }: { serviceId: string; specialistId: string; date: string; branchId?: string },
  signal?: AbortSignal,
) =>
  request<Availability>(
    `/availability?${new URLSearchParams(branchId ? { ...params, branchId } : params)}`,
    { signal },
  )

const getMapPlaces = (
  params: { lat?: number; lng?: number; kind?: string },
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value))
  }

  return request<MapPlace[]>(`/map?${query}`, { signal })
}

const getNextFree = (slugs: string[], signal?: AbortSignal) =>
  request<NextFree>(`/next-free?${new URLSearchParams({ slugs: slugs.join(',') })}`, { signal })

const createBooking = (input: CreateBookingInput) => post<CreatedBooking>('/bookings', input)

const getBooking = (id: string, token: string, signal?: AbortSignal) =>
  request<Booking>(`/bookings/${id}`, { headers: { [TOKEN_HEADER]: token }, signal })

const cancelBooking = (id: string, token: string) =>
  request<Booking>(`/bookings/${id}`, { method: 'DELETE', headers: { [TOKEN_HEADER]: token } })

const restoreBooking = (id: string, token: string) =>
  request<Booking>(`/bookings/${id}/restore`, {
    method: 'POST',
    headers: { [TOKEN_HEADER]: token },
  })

type WalletLinks = { apple: string | null; google: string | null }

const getWalletConfig = () => request<{ apple: boolean; google: boolean }>('/wallet/config')

const getWalletLinks = (id: string, token: string | null) =>
  token
    ? request<WalletLinks>(`/bookings/${id}/wallet`, {
        method: 'POST',
        headers: { [TOKEN_HEADER]: token },
      })
    : request<WalletLinks>(`/me/bookings/${id}/wallet`, { method: 'POST' })

const requestOtp = (phone: string, channel: 'auto' | 'sms' = 'auto') =>
  post<OtpRequest>('/auth/otp', { phone, channel })

const verifyOtp = (phone: string, code: string) => post<Customer>('/auth/verify', { phone, code })

const logout = () => post<void>('/auth/logout')

const getMe = (signal?: AbortSignal) => request<Customer>('/me', { signal })

const updateMe = (name: string) =>
  request<Customer>('/me', { method: 'PATCH', body: JSON.stringify({ name }) })

const getMyBookings = (signal?: AbortSignal) => request<Booking[]>('/me/bookings', { signal })

const cancelMyBooking = (id: string) => request<Booking>(`/me/bookings/${id}`, { method: 'DELETE' })

const restoreMyBooking = (id: string) =>
  request<Booking>(`/me/bookings/${id}/restore`, { method: 'POST' })

const send = <Result>(method: 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  request<Result>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

const manage = (slug: string) => `/manage/${encodeURIComponent(slug)}`

const accessHeaders = ({ token, signature }: ReviewAccess): Record<string, string> => ({
  ...(token ? { [TOKEN_HEADER]: token } : {}),
  ...(signature ? { [SIGNATURE_HEADER]: signature } : {}),
})

const getVisitReview = (id: string, access: ReviewAccess, signal?: AbortSignal) =>
  request<VisitReview>(`/bookings/${id}/review`, { headers: accessHeaders(access), signal })

const createReview = (
  id: string,
  access: ReviewAccess,
  input: { rating: number; comment: string },
) =>
  request<Review & { slug: string }>(`/bookings/${id}/review`, {
    method: 'POST',
    headers: accessHeaders(access),
    body: JSON.stringify(input),
  })

const getManagedReviews = (slug: string, signal?: AbortSignal) =>
  request<ReviewSummary<ManagedReview>>(`${manage(slug)}/reviews`, { signal })

const replyToReview = (slug: string, id: string, text: string) =>
  send<{ id: string; reply: string | null }>('PUT', `${manage(slug)}/reviews/${id}/reply`, { text })

const setBookingOutcome = (slug: string, id: string, input: OutcomeInput) =>
  send<AdminBooking>('PATCH', `${manage(slug)}/bookings/${id}/outcome`, input)

const getClients = (slug: string, query: string, signal?: AbortSignal) =>
  request<ClientListItem[]>(`${manage(slug)}/clients?${new URLSearchParams({ q: query })}`, {
    signal,
  })

const getClient = (slug: string, phone: string, signal?: AbortSignal) =>
  request<ClientCard>(`${manage(slug)}/clients/${encodeURIComponent(phone)}`, { signal })

const updateClient = (
  slug: string,
  phone: string,
  input: { note: string; birthday: string | null },
) =>
  send<{ phone: string; note: string; birthday: string | null }>(
    'PUT',
    `${manage(slug)}/clients/${encodeURIComponent(phone)}`,
    input,
  )

const getMasterSchedule = (slug: string, id: string, signal?: AbortSignal) =>
  request<MasterSchedule>(`${manage(slug)}/specialists/${id}/schedule`, { signal })

const setMasterHours = (
  slug: string,
  id: string,
  input: { hasOwnHours: boolean; days: WorkingDay[] },
) => send<MasterSchedule>('PUT', `${manage(slug)}/specialists/${id}/hours`, input)

const addMasterLeave = (
  slug: string,
  id: string,
  input: { startsOn: string; endsOn: string; reason: string },
) =>
  post<{ leave: MasterSchedule['leaves'][number]; conflictingBookings: number }>(
    `${manage(slug)}/specialists/${id}/leaves`,
    input,
  )

const removeMasterLeave = (slug: string, id: string, leaveId: string) =>
  send<void>('DELETE', `${manage(slug)}/specialists/${id}/leaves/${leaveId}`)

const getTelegramStatus = (slug: string, signal?: AbortSignal) =>
  request<TelegramStatus>(`${manage(slug)}/telegram`, { signal })

const createTelegramLink = (slug: string) =>
  post<{ url: string; code: string }>(`${manage(slug)}/telegram/link`)

const removeTelegramChat = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/telegram/${id}`)

const getAnalytics = (slug: string, days: AnalyticsDays, signal?: AbortSignal) =>
  request<AnalyticsReport>(
    `${manage(slug)}/analytics?${new URLSearchParams({ days: String(days) })}`,
    {
      signal,
    },
  )

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

const createStaffBooking = (slug: string, input: CreateBookingInput) =>
  post<AdminBooking>(`${manage(slug)}/bookings`, input)

const cancelBookingAsSalon = (slug: string, id: string) =>
  post<AdminBooking>(`${manage(slug)}/bookings/${id}/cancel`)

const getRecentBookings = (slug: string, since: string, signal?: AbortSignal) =>
  request<RecentBooking[]>(`${manage(slug)}/bookings/recent?${new URLSearchParams({ since })}`, {
    signal,
  })

const moveBookingAsSalon = (
  slug: string,
  id: string,
  input: { date: string; time: string; specialistId: string },
) => send<MovedBooking>('PATCH', `${manage(slug)}/bookings/${id}`, input)

const upload = <Result>(path: string, file: File) => {
  const body = new FormData()
  body.append('file', file)

  return request<Result>(path, { method: 'POST', body })
}

const uploadCover = (slug: string, file: File) =>
  upload<{ coverUrl: string }>(`${manage(slug)}/cover`, file)

const removeCover = (slug: string) => send<void>('DELETE', `${manage(slug)}/cover`)

const addPhoto = (slug: string, file: File) =>
  upload<{ photos: string[] }>(`${manage(slug)}/photos`, file)

const removePhoto = (slug: string, url: string) =>
  send<{ photos: string[] }>('DELETE', `${manage(slug)}/photos?${new URLSearchParams({ url })}`)

const uploadSpecialistPhoto = (slug: string, id: string, file: File) =>
  upload<{ photoUrl: string }>(`${manage(slug)}/specialists/${id}/photo`, file)

const removeSpecialistPhoto = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/specialists/${id}/photo`)

const createBranch = (slug: string, input: BranchInput) =>
  post<Branch>(`${manage(slug)}/branches`, input)

const updateBranch = (slug: string, id: string, input: BranchInput) =>
  send<Branch>('PUT', `${manage(slug)}/branches/${id}`, input)

const deleteBranch = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/branches/${id}`)

const restoreBookingAsSalon = (slug: string, id: string) =>
  post<AdminBooking>(`${manage(slug)}/bookings/${id}/restore`)

const createTimeOff = (slug: string, input: CreateTimeOffInput) =>
  post<CreatedTimeOff>(`${manage(slug)}/time-off`, input)

const deleteTimeOff = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/time-off/${id}`)

export {
  createBranch,
  deleteBranch,
  getMapPlaces,
  updateBranch,
  addPhoto,
  cancelBooking,
  cancelBookingAsSalon,
  cancelMyBooking,
  checkSlug,
  createBooking,
  createBusiness,
  createCategory,
  createService,
  createSpecialist,
  createStaffBooking,
  createTimeOff,
  deleteCategory,
  deleteTimeOff,
  getAdminSchedule,
  getAnalytics,
  getMasterSchedule,
  setMasterHours,
  addMasterLeave,
  removeMasterLeave,
  setBookingOutcome,
  getClients,
  getClient,
  updateClient,
  getVisitReview,
  createReview,
  getManagedReviews,
  replyToReview,
  getTelegramStatus,
  createTelegramLink,
  removeTelegramChat,
  getAvailability,
  getBooking,
  getManagedBusiness,
  getMe,
  getMyBookings,
  getMyBusinesses,
  getNextFree,
  getRecentBookings,
  getWalletConfig,
  getWalletLinks,
  moveBookingAsSalon,
  removeCover,
  removePhoto,
  removeSpecialistPhoto,
  renameCategory,
  restoreBooking,
  restoreBookingAsSalon,
  restoreMyBooking,
  searchBusinesses,
  setWorkingHours,
  updateBusiness,
  updateService,
  updateSpecialist,
  uploadCover,
  uploadSpecialistPhoto,
  logout,
  requestOtp,
  updateMe,
  verifyOtp,
}
