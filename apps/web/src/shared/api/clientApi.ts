import { CLIENT_API_PREFIX } from '@/shared/config/api'
import { toApiError } from './apiError'
import type {
  AdminBooking,
  AdminSchedule,
  AnalyticsDays,
  AnalyticsGoal,
  AnalyticsReport,
  Availability,
  AvatarUpload,
  BirthdayGreeting,
  Booking,
  BookingTelegramLink,
  Branch,
  BranchInput,
  BulkReplyResult,
  BusinessCard,
  BusinessLink,
  BusinessPage,
  BusinessProfile,
  BusinessQuestion,
  Category,
  CheckoutLink,
  ClientCard,
  ClientList,
  ClientLoyalty,
  ClientNote,
  ClientSegment,
  ClientSort,
  ClosedDay,
  CoverUpload,
  CreateBookingInput,
  CreateBusinessInput,
  CreatedBooking,
  CreatedId,
  CreatedLeave,
  CreatedReview,
  CreatedTimeOff,
  CreateTimeOffInput,
  Customer,
  FeedLikes,
  FeedPage,
  FunnelFlow,
  FunnelReport,
  FunnelSegment,
  FunnelSegmentsReport,
  FunnelSignalsReport,
  GeoPlace,
  GeoReverse,
  GiftCertificate,
  ImportReport,
  JoinWaitlistInput,
  LogoUpload,
  LoyaltyOverview,
  LoyaltySettings,
  MailingPreview,
  MailingSegment,
  MailingSent,
  MailingsOverview,
  ManagedReview,
  ManagedWaitlistEntry,
  MapPlace,
  MasterDay,
  MasterPayout,
  MasterPayoutInput,
  MasterPayScheme,
  MasterPlace,
  MasterReviews,
  MasterSchedule,
  MovedBooking,
  MyLoyalty,
  NextFree,
  Offer,
  OtpRequest,
  OutcomeInput,
  PageStats,
  PaymentSync,
  PaymentsConfig,
  PriceQuote,
  ProfileSettings,
  Promotion,
  PromotionInput,
  PublicProfile,
  RecentBooking,
  Recommendation,
  ReviewAccess,
  ReviewerProfile,
  ReviewPhotos,
  ReviewReply,
  ReviewReplySettings,
  ReviewResolution,
  ReviewSummary,
  ScheduleLoad,
  ServiceInput,
  Session,
  SettingsSummary,
  SlugCheck,
  SpecialistInput,
  SpecialistPhotoUpload,
  StockItem,
  StockItemInput,
  SubscriptionPlan,
  SubscriptionPlanInput,
  TeamMember,
  TelegramLink,
  TelegramLoginConfig,
  TelegramLoginState,
  TelegramStatus,
  TestPaymentResult,
  UnclosedDays,
  UpdateBusinessInput,
  UploadedPhoto,
  VisitReview,
  WaitlistEntry,
  WalletConfig,
  WalletLinks,
  WorkingDay,
  WorkPhoto,
  WorkPhotoInput,
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

// A page of the catalog's services feed (endless scroll); same order as the server's first page.
const listOffersPage = (
  query: {
    kind?: string
    q?: string
    offset: number
    limit: number
    sort: 'popular' | 'price'
  },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({
    offset: String(query.offset),
    limit: String(query.limit),
    sort: query.sort,
  })
  if (query.kind) params.set('kind', query.kind)
  if (query.q) params.set('q', query.q)
  return request<Offer[]>(`/businesses/offers?${params}`, { signal })
}

// Favourite services by id (they live on the device), in the catalog's card shape.
const listOffersByIds = (ids: string[], signal?: AbortSignal) =>
  request<Offer[]>(`/businesses/offers?ids=${encodeURIComponent(ids.join(','))}&limit=60`, {
    signal,
  })

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

const getMyProfileSettings = (signal?: AbortSignal) =>
  request<ProfileSettings>('/me/profile', { signal })

const updateMyProfileSettings = (
  input: Partial<Omit<ProfileSettings, 'id'>> & {
    banner?: string | null
    accent?: string | null
  },
) => send<ProfileSettings>('PATCH', '/me/profile', input)

const getProfile = (id: string, signal?: AbortSignal) =>
  request<PublicProfile>(`/profiles/${encodeURIComponent(id)}`, { signal })

const getReviewer = (id: string, signal?: AbortSignal) =>
  request<ReviewerProfile>(`/reviewers/${encodeURIComponent(id)}`, { signal })

// A place's reviews on the client (the booking form asks for those of the chosen service).
const listPlaceReviews = (
  slug: string,
  {
    serviceId,
    specialistId,
    limit = 3,
  }: { serviceId?: string; specialistId?: string; limit?: number },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (serviceId) params.set('serviceId', serviceId)
  if (serviceId && specialistId) params.set('specialistId', specialistId)
  return request<ReviewSummary>(`/businesses/${encodeURIComponent(slug)}/reviews?${params}`, {
    signal,
  })
}

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

// Each service of a place with its first free time today or tomorrow (the booking form's list).
const getServicesNextFree = (slug: string, branchId?: string, signal?: AbortSignal) => {
  const params = new URLSearchParams(branchId ? { branchId } : {})
  return request<NextFree>(`/businesses/${encodeURIComponent(slug)}/next-free-services?${params}`, {
    signal,
  })
}

// «Нравится» in «Работы»: one per photo and device session; answers the photo's count.
const likeFeedItem = (id: string, session: string, isLiked: boolean) =>
  request<FeedLikes>(`/feed/${id}/${isLiked ? 'like' : 'unlike'}`, {
    method: 'POST',
    body: JSON.stringify({ session }),
  })

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

const getWalletConfig = () => request<WalletConfig>('/wallet/config')

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

// Platform admins: a flow's funnel, for everyone or one kind of device; trouble; who comes.
const getFunnelReport = (
  query: { days: number; flow: FunnelFlow } & FunnelSegment,
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query))
    if (value !== undefined) params.set(key, String(value))
  return request<FunnelReport>(`/telemetry/funnel?${params}`, { signal })
}

const getFunnelSignals = (days: number, signal?: AbortSignal) =>
  request<FunnelSignalsReport>(`/telemetry/signals?days=${days}`, { signal })

const getFunnelSegments = (days: number, signal?: AbortSignal) =>
  request<FunnelSegmentsReport>(`/telemetry/segments?days=${days}`, { signal })

const getTelegramLoginConfig = (signal?: AbortSignal) =>
  request<TelegramLoginConfig>('/auth/telegram', { signal })

const startTelegramLogin = (token: string) => post<void>('/auth/telegram', { token })

const checkTelegramLogin = (token: string) =>
  post<TelegramLoginState>('/auth/telegram/check', { token })

const logout = () => post<void>('/auth/logout')

const getSession = (signal?: AbortSignal) => request<Session>('/session', { signal })

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

const askQuestion = (slug: string, text: string) =>
  request<BusinessQuestion>(`/businesses/${encodeURIComponent(slug)}/questions`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })

const getManagedQuestions = (slug: string, signal?: AbortSignal) =>
  request<BusinessQuestion[]>(`${manage(slug)}/questions`, { signal })

const answerQuestion = (slug: string, id: string, text: string) =>
  send<BusinessQuestion>('PUT', `${manage(slug)}/questions/${id}/answer`, { text })

const removeQuestion = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/questions/${id}`)

const addReviewPhoto = (id: string, access: ReviewAccess, file: File) => {
  const body = new FormData()
  body.append('file', file)

  return request<ReviewPhotos>(`/bookings/${id}/review/photos`, {
    method: 'POST',
    headers: accessHeaders(access),
    body,
  })
}

const getVisitReview = (id: string, access: ReviewAccess, signal?: AbortSignal) =>
  request<VisitReview>(`/bookings/${id}/review`, { headers: accessHeaders(access), signal })

const createReview = (
  id: string,
  access: ReviewAccess,
  input: { rating: number; comment: string },
) =>
  request<CreatedReview>(`/bookings/${id}/review`, {
    method: 'POST',
    headers: accessHeaders(access),
    body: JSON.stringify(input),
  })

const getManagedReviews = (slug: string, signal?: AbortSignal) =>
  request<ReviewSummary<ManagedReview>>(`${manage(slug)}/reviews`, { signal })

const replyToReview = (slug: string, id: string, text: string) =>
  send<ReviewReply>('PUT', `${manage(slug)}/reviews/${id}/reply`, { text })

const getReviewReplySettings = (slug: string, signal?: AbortSignal) =>
  request<ReviewReplySettings>(`${manage(slug)}/reviews/settings`, { signal })

const saveReviewReplySettings = (slug: string, settings: ReviewReplySettings) =>
  send<ReviewReplySettings>('PUT', `${manage(slug)}/reviews/settings`, settings)

const replyToQuietReviews = (slug: string, input: { minRating: 4 | 5; template: string }) =>
  post<BulkReplyResult>(`${manage(slug)}/reviews/bulk-reply`, input)

const setReviewResolved = (slug: string, id: string, isResolved: boolean) =>
  send<ReviewResolution>('PUT', `${manage(slug)}/reviews/${id}/resolved`, { isResolved })

const getMasterReviews = (slug: string, signal?: AbortSignal) =>
  request<MasterReviews>(`/master/${encodeURIComponent(slug)}/reviews`, { signal })

const setBookingOutcome = (slug: string, id: string, input: OutcomeInput) =>
  send<AdminBooking>('PATCH', `${manage(slug)}/bookings/${id}/outcome`, input)

const getClients = (
  slug: string,
  params: { q: string; segment: ClientSegment; sort: ClientSort; limit: number },
  signal?: AbortSignal,
) =>
  request<ClientList>(
    `${manage(slug)}/clients?${new URLSearchParams({ ...params, limit: String(params.limit) })}`,
    { signal },
  )

const getClient = (slug: string, phone: string, signal?: AbortSignal) =>
  request<ClientCard>(`${manage(slug)}/clients/${encodeURIComponent(phone)}`, { signal })

const updateClient = (
  slug: string,
  phone: string,
  input: { note: string; birthday: string | null },
) => send<ClientNote>('PUT', `${manage(slug)}/clients/${encodeURIComponent(phone)}`, input)

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
) => post<CreatedLeave>(`${manage(slug)}/specialists/${id}/leaves`, input)

const removeMasterLeave = (slug: string, id: string, leaveId: string) =>
  send<void>('DELETE', `${manage(slug)}/specialists/${id}/leaves/${leaveId}`)

const getMasterPay = (slug: string, id: string, signal?: AbortSignal) =>
  request<MasterPayScheme>(`${manage(slug)}/specialists/${id}/pay`, { signal })

const setMasterPay = (slug: string, id: string, scheme: MasterPayScheme) =>
  send<MasterPayScheme>('PUT', `${manage(slug)}/specialists/${id}/pay`, scheme)

const addMasterPayout = (slug: string, input: MasterPayoutInput) =>
  post<MasterPayout>(`${manage(slug)}/payouts`, input)

const removeMasterPayout = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/payouts/${id}`)

const getMasterPlaces = (signal?: AbortSignal) => request<MasterPlace[]>('/me/master', { signal })

const getMasterDay = (slug: string, date: string, signal?: AbortSignal) =>
  request<MasterDay>(`/master/${encodeURIComponent(slug)}/day?${new URLSearchParams({ date })}`, {
    signal,
  })

const setMasterOutcome = (slug: string, id: string, input: OutcomeInput) =>
  send<AdminBooking>('PATCH', `/master/${encodeURIComponent(slug)}/bookings/${id}/outcome`, input)

const moveMyBooking = (id: string, token: string | null, input: { date: string; time: string }) =>
  request<Booking>(`/bookings/${id}`, {
    method: 'PATCH',
    headers: token ? { [TOKEN_HEADER]: token } : {},
    body: JSON.stringify(input),
  })

const closeDay = (slug: string, date: string) =>
  post<ClosedDay>(`${manage(slug)}/bookings/close-day`, { date })

const reopenVisits = (slug: string, ids: string[]) =>
  post<void>(`${manage(slug)}/bookings/reopen`, { ids })

const getScheduleLoad = (slug: string, from: string, days: number, signal?: AbortSignal) =>
  request<ScheduleLoad>(`${manage(slug)}/schedule/load?from=${from}&days=${days}`, { signal })

const getUnclosedVisits = (slug: string, signal?: AbortSignal) =>
  request<UnclosedDays>(`${manage(slug)}/bookings/unclosed`, { signal })

const getTelegramStatus = (slug: string, signal?: AbortSignal) =>
  request<TelegramStatus>(`${manage(slug)}/telegram`, { signal })

const createTelegramLink = (slug: string) => post<TelegramLink>(`${manage(slug)}/telegram/link`)

const removeTelegramChat = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/telegram/${id}`)

const getAnalytics = (slug: string, days: AnalyticsDays, signal?: AbortSignal) =>
  request<AnalyticsReport>(
    `${manage(slug)}/analytics?${new URLSearchParams({ days: String(days) })}`,
    {
      signal,
    },
  )

const setAnalyticsGoal = (slug: string, goal: number | null) =>
  send<AnalyticsGoal>('PUT', `${manage(slug)}/analytics/goal`, { goal })

const searchBusinesses = (query: string, signal?: AbortSignal) =>
  request<BusinessCard[]>(`/businesses?${new URLSearchParams({ q: query })}`, { signal })

const getMyBusinesses = (signal?: AbortSignal) =>
  request<BusinessLink[]>('/me/businesses', { signal })

const checkSlug = (slug: string, signal?: AbortSignal) =>
  request<SlugCheck>(`/businesses/slug-available?${new URLSearchParams({ slug })}`, { signal })

const createBusiness = (input: CreateBusinessInput) => post<BusinessProfile>('/businesses', input)

const getManagedBusiness = (slug: string, signal?: AbortSignal) =>
  request<BusinessPage>(manage(slug), { signal })

const updateBusiness = (slug: string, input: UpdateBusinessInput) =>
  send<BusinessProfile>('PATCH', manage(slug), input)

const setWorkingHours = (slug: string, days: WorkingDay[]) =>
  send<BusinessProfile>('PUT', `${manage(slug)}/hours`, days)

const createCategory = (slug: string, name: string) =>
  post<Category>(`${manage(slug)}/categories`, { name })

const renameCategory = (slug: string, id: string, name: string) =>
  send<void>('PATCH', `${manage(slug)}/categories/${id}`, { name })

const deleteCategory = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/categories/${id}`)

const createService = (slug: string, input: ServiceInput) =>
  post<CreatedId>(`${manage(slug)}/services`, input)

const updateService = (slug: string, id: string, input: ServiceInput) =>
  send<void>('PUT', `${manage(slug)}/services/${id}`, input)

const createSpecialist = (slug: string, input: SpecialistInput) =>
  post<CreatedId>(`${manage(slug)}/specialists`, input)

const updateSpecialist = (slug: string, id: string, input: SpecialistInput) =>
  send<void>('PUT', `${manage(slug)}/specialists/${id}`, input)

const getAdminSchedule = (slug: string, date: string, signal?: AbortSignal) =>
  request<AdminSchedule>(`${manage(slug)}/schedule?${new URLSearchParams({ date })}`, { signal })

const createStaffBooking = (slug: string, input: CreateBookingInput) =>
  post<AdminBooking>(`${manage(slug)}/bookings`, input)

const cancelBookingAsSalon = (slug: string, id: string) =>
  post<Booking>(`${manage(slug)}/bookings/${id}/cancel`)

const getRecentBookings = (slug: string, since: string, signal?: AbortSignal) =>
  request<RecentBooking[]>(`${manage(slug)}/bookings/recent?${new URLSearchParams({ since })}`, {
    signal,
  })

const moveBookingAsSalon = (
  slug: string,
  id: string,
  input: { date: string; time: string; specialistId: string },
) => send<MovedBooking>('PATCH', `${manage(slug)}/bookings/${id}`, input)

const upload = <Result>(path: string, file: File, fields: Record<string, string> = {}) => {
  const body = new FormData()
  body.append('file', file)
  for (const [key, value] of Object.entries(fields)) body.append(key, value)

  return request<Result>(path, { method: 'POST', body })
}

const uploadCover = (slug: string, file: File) => upload<CoverUpload>(`${manage(slug)}/cover`, file)

const removeCover = (slug: string) => send<void>('DELETE', `${manage(slug)}/cover`)

const uploadLogo = (slug: string, file: File) => upload<LogoUpload>(`${manage(slug)}/logo`, file)

const removeLogo = (slug: string) => send<void>('DELETE', `${manage(slug)}/logo`)

const addPhoto = (
  slug: string,
  file: File,
  tags: { serviceId?: string | null; specialistId?: string | null } = {},
) =>
  upload<WorkPhoto[]>(`${manage(slug)}/photos`, file, {
    ...(tags.serviceId ? { serviceId: tags.serviceId } : {}),
    ...(tags.specialistId ? { specialistId: tags.specialistId } : {}),
  })

const getWorkPhotos = (slug: string, signal?: AbortSignal) =>
  request<WorkPhoto[]>(`${manage(slug)}/work-photos`, { signal })

const updateWorkPhoto = (slug: string, id: string, input: WorkPhotoInput) =>
  send<WorkPhoto[]>('PATCH', `${manage(slug)}/work-photos/${id}`, input)

// «Работы» in the owner's order: every photo's id, first to last.
const reorderWorkPhotos = (slug: string, ids: string[]) =>
  send<WorkPhoto[]>('PUT', `${manage(slug)}/work-photos/order`, { ids })

// Address search for the branch sheet (`/geo`, Photon behind our API).
const searchAddress = (query: string, signal?: AbortSignal) =>
  request<GeoPlace[]>(`/geo/search?${new URLSearchParams({ q: query })}`, { signal })

const reverseAddress = (point: { latitude: number; longitude: number }, signal?: AbortSignal) =>
  request<GeoReverse>(
    `/geo/reverse?${new URLSearchParams({ lat: String(point.latitude), lng: String(point.longitude) })}`,
    { signal },
  )

const getSettingsSummary = (slug: string, signal?: AbortSignal) =>
  request<SettingsSummary>(`${manage(slug)}/settings-summary`, { signal })

const getPageStats = (slug: string, signal?: AbortSignal) =>
  request<PageStats>(`${manage(slug)}/page-stats`, { signal })

const removePhoto = (slug: string, id: string) =>
  send<WorkPhoto[]>('DELETE', `${manage(slug)}/work-photos/${id}`)

const addVisitPhoto = (slug: string, bookingId: string, file: File) =>
  upload<UploadedPhoto>(`/master/${slug}/photos`, file, { bookingId })

const getFeed = (
  query: {
    kind?: string
    business?: string
    start?: string
    lat?: number
    lng?: number
    offset?: number
  },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return request<FeedPage>(`/feed?${params}`, { signal })
}

const getRecommendations = (
  query: {
    interests?: string
    gender?: string
    budget?: number
    visits?: string
    lat?: number
    lng?: number
    /** The service being chosen: picks follow it. */
    like?: string
    /** Services looked at lately on this device, comma-separated. */
    recent?: string
    /** The device's random id: what it was already shown steps aside. */
    session?: string
  },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return request<Recommendation[]>(`/recommendations?${params}`, { signal })
}

const reportFeedItem = (id: string) => post<void>(`/feed/${id}/report`, {})

const uploadSpecialistPhoto = (slug: string, id: string, file: File) =>
  upload<SpecialistPhotoUpload>(`${manage(slug)}/specialists/${id}/photo`, file)

const removeSpecialistPhoto = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/specialists/${id}/photo`)

const createBranch = (slug: string, input: BranchInput) =>
  post<Branch>(`${manage(slug)}/branches`, input)

const updateBranch = (slug: string, id: string, input: BranchInput) =>
  send<Branch>('PUT', `${manage(slug)}/branches/${id}`, input)

const deleteBranch = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/branches/${id}`)

const restoreBookingAsSalon = (slug: string, id: string) =>
  post<Booking>(`${manage(slug)}/bookings/${id}/restore`)

const createTimeOff = (slug: string, input: CreateTimeOffInput) =>
  post<CreatedTimeOff>(`${manage(slug)}/time-off`, input)

const deleteTimeOff = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/time-off/${id}`)

const WAITLIST_TOKEN_HEADER = 'x-waitlist-token'

const joinWaitlist = (input: JoinWaitlistInput) =>
  post<WaitlistEntry & { token: string }>('/waitlist', input)

const getWaitlistEntry = (id: string, token: string, signal?: AbortSignal) =>
  request<WaitlistEntry>(`/waitlist/${id}`, { headers: { [WAITLIST_TOKEN_HEADER]: token }, signal })

const leaveWaitlist = (id: string, token: string) =>
  request<WaitlistEntry>(`/waitlist/${id}`, {
    method: 'DELETE',
    headers: { [WAITLIST_TOKEN_HEADER]: token },
  })

const getMyWaitlist = (signal?: AbortSignal) => request<WaitlistEntry[]>('/me/waitlist', { signal })

const leaveMyWaitlist = (id: string) =>
  request<WaitlistEntry>(`/me/waitlist/${id}`, { method: 'DELETE' })

const getManagedWaitlist = (slug: string, signal?: AbortSignal) =>
  request<ManagedWaitlistEntry[]>(`${manage(slug)}/waitlist`, { signal })

const removeManagedWaitlist = (slug: string, id: string) =>
  request<void>(`${manage(slug)}/waitlist/${id}`, { method: 'DELETE' })

const getPaymentConfig = (signal?: AbortSignal) =>
  request<PaymentsConfig>('/payments/config', { signal })

const completeTestPayment = (id: string, signature: string) =>
  request<TestPaymentResult>(
    `/payments/${id}/test-complete?${new URLSearchParams({ s: signature })}`,
    { method: 'POST' },
  )

const syncPayment = (id: string, signature: string) =>
  request<PaymentSync>(`/payments/${id}/sync?${new URLSearchParams({ s: signature })}`, {
    method: 'POST',
  })

const getCheckoutUrl = (id: string, token: string | null) =>
  request<CheckoutLink>(`/bookings/${id}/checkout`, {
    headers: token ? { [TOKEN_HEADER]: token } : {},
  })

// «Напоминать в Telegram»: the bot link for this booking's number (null without a bot).
const getTelegramLink = (id: string, token: string | null) =>
  request<BookingTelegramLink>(`/bookings/${id}/telegram`, {
    headers: token ? { [TOKEN_HEADER]: token } : {},
  })

const getPriceQuote = (
  params: { serviceId: string; date: string; time: string; code?: string; phone?: string },
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  return request<PriceQuote>(`/promotions/quote?${query}`, { signal })
}

const getManagedPromotions = (slug: string, signal?: AbortSignal) =>
  request<Promotion[]>(`${manage(slug)}/promotions`, { signal })

const createPromotion = (slug: string, input: PromotionInput) =>
  post<Promotion>(`${manage(slug)}/promotions`, input)

const updatePromotion = (slug: string, id: string, input: PromotionInput) =>
  send<Promotion>('PUT', `${manage(slug)}/promotions/${id}`, input)

const deletePromotion = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/promotions/${id}`)

const getLoyalty = (slug: string, signal?: AbortSignal) =>
  request<LoyaltyOverview>(`${manage(slug)}/loyalty`, { signal })

const setBonusPercent = (slug: string, bonusPercent: number | null) =>
  send<LoyaltySettings>('PUT', `${manage(slug)}/loyalty/settings`, { bonusPercent })

const saveSubscriptionPlan = (slug: string, input: SubscriptionPlanInput, id?: string) =>
  id
    ? send<SubscriptionPlan[]>('PUT', `${manage(slug)}/loyalty/plans/${id}`, input)
    : post<SubscriptionPlan[]>(`${manage(slug)}/loyalty/plans`, input)

const deleteSubscriptionPlan = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/loyalty/plans/${id}`)

const issueCertificate = (
  slug: string,
  input: { amount: number; recipient: string; phone: string; expiresOn: string | null },
) => post<GiftCertificate>(`${manage(slug)}/loyalty/certificates`, input)

const getClientLoyalty = (slug: string, phone: string, signal?: AbortSignal) =>
  request<ClientLoyalty>(`${manage(slug)}/loyalty/clients/${encodeURIComponent(phone)}`, { signal })

const getStock = (slug: string, signal?: AbortSignal) =>
  request<StockItem[]>(`${manage(slug)}/stock`, { signal })

const saveStockItem = (slug: string, input: StockItemInput, id?: string) =>
  id
    ? send<StockItem[]>('PUT', `${manage(slug)}/stock/${id}`, input)
    : post<StockItem[]>(`${manage(slug)}/stock`, input)

const deleteStockItem = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/stock/${id}`)

const receiveStock = (slug: string, id: string, quantity: number, unitCost?: number) =>
  post<StockItem[]>(`${manage(slug)}/stock/${id}/receive`, { quantity, unitCost })

const adjustStock = (slug: string, id: string, quantity: number) =>
  post<StockItem[]>(`${manage(slug)}/stock/${id}/adjust`, { quantity })

const uploadAvatar = (file: File) => upload<AvatarUpload>('/me/avatar', file)

const removeAvatar = () => send<void>('DELETE', '/me/avatar')

const importClients = (slug: string, clients: Record<string, string>[]) =>
  post<ImportReport>(`${manage(slug)}/import/clients`, { clients })

const importBookings = (slug: string, bookings: Record<string, string>[], remind: boolean) =>
  post<ImportReport>(`${manage(slug)}/import/bookings`, { bookings, remind })

const sellSubscription = (slug: string, phone: string, planId: string) =>
  post<ClientLoyalty>(
    `${manage(slug)}/loyalty/clients/${encodeURIComponent(phone)}/subscriptions`,
    {
      planId,
    },
  )

const getMyLoyalty = (signal?: AbortSignal) => request<MyLoyalty>('/me/loyalty', { signal })

const getMailings = (slug: string, signal?: AbortSignal) =>
  request<MailingsOverview>(`${manage(slug)}/mailings`, { signal })

const previewMailing = (
  slug: string,
  segment: MailingSegment,
  days: number,
  signal?: AbortSignal,
) =>
  request<MailingPreview>(
    `${manage(slug)}/mailings/preview?${new URLSearchParams({ segment, days: String(days) })}`,
    { signal },
  )

const sendMailing = (
  slug: string,
  input: { segment: MailingSegment; days: number; text: string },
) => post<MailingSent>(`${manage(slug)}/mailings`, input)

const setBirthdayGreeting = (slug: string, text: string | null) =>
  send<BirthdayGreeting>('PUT', `${manage(slug)}/mailings/birthday`, { text })

const getTeam = (slug: string, signal?: AbortSignal) =>
  request<TeamMember[]>(`${manage(slug)}/members`, { signal })

const addTeamMember = (slug: string, phone: string) =>
  post<TeamMember[]>(`${manage(slug)}/members`, { phone })

const removeTeamMember = (slug: string, id: string) =>
  send<void>('DELETE', `${manage(slug)}/members/${id}`)

export {
  getFunnelReport,
  getFunnelSegments,
  getFunnelSignals,
  listOffersByIds,
  listOffersPage,
  addTeamMember,
  getTeam,
  removeTeamMember,
  getMailings,
  previewMailing,
  sendMailing,
  setBirthdayGreeting,
  deleteSubscriptionPlan,
  getClientLoyalty,
  getLoyalty,
  getMyLoyalty,
  issueCertificate,
  saveSubscriptionPlan,
  sellSubscription,
  importClients,
  uploadAvatar,
  removeAvatar,
  getWorkPhotos,
  reorderWorkPhotos,
  getPageStats,
  getSettingsSummary,
  searchAddress,
  reverseAddress,
  updateWorkPhoto,
  addVisitPhoto,
  getFeed,
  reportFeedItem,
  getRecommendations,
  importBookings,
  getStock,
  saveStockItem,
  deleteStockItem,
  receiveStock,
  adjustStock,
  setBonusPercent,
  createPromotion,
  deletePromotion,
  getManagedPromotions,
  getPriceQuote,
  updatePromotion,
  completeTestPayment,
  syncPayment,
  getCheckoutUrl,
  getTelegramLink,
  getPaymentConfig,
  getManagedWaitlist,
  removeManagedWaitlist,
  getMyWaitlist,
  getWaitlistEntry,
  joinWaitlist,
  leaveMyWaitlist,
  leaveWaitlist,
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
  setAnalyticsGoal,
  closeDay,
  reopenVisits,
  moveMyBooking,
  getScheduleLoad,
  getUnclosedVisits,
  getMasterPlaces,
  getMasterDay,
  setMasterOutcome,
  getMasterSchedule,
  setMasterHours,
  addMasterLeave,
  removeMasterLeave,
  getMasterPay,
  setMasterPay,
  addMasterPayout,
  removeMasterPayout,
  setBookingOutcome,
  getClients,
  getClient,
  updateClient,
  getVisitReview,
  addReviewPhoto,
  answerQuestion,
  askQuestion,
  getManagedQuestions,
  removeQuestion,
  createReview,
  getManagedReviews,
  replyToReview,
  getReviewReplySettings,
  saveReviewReplySettings,
  replyToQuietReviews,
  setReviewResolved,
  getMasterReviews,
  getTelegramStatus,
  createTelegramLink,
  removeTelegramChat,
  getAvailability,
  getMyProfileSettings,
  getProfile,
  getReviewer,
  updateMyProfileSettings,
  listPlaceReviews,
  getBooking,
  getManagedBusiness,
  getSession,
  getMyBookings,
  getMyBusinesses,
  getNextFree,
  likeFeedItem,
  getServicesNextFree,
  getRecentBookings,
  getWalletConfig,
  getWalletLinks,
  moveBookingAsSalon,
  removeCover,
  removeLogo,
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
  uploadLogo,
  uploadSpecialistPhoto,
  logout,
  requestOtp,
  startTelegramLogin,
  checkTelegramLogin,
  getTelegramLoginConfig,
  updateMe,
  verifyOtp,
}
