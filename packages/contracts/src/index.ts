type Category = {
  id: string
  name: string
}

type Service = {
  id: string
  categoryId: string
  name: string
  description: string
  durationMinutes: number
  price: number
  /** Prepayment asked for online bookings (сом); null = none. */
  deposit?: number | null
  /** «Пора прийти снова» after this many days; null = no reminder. */
  rebookDays?: number | null
  isPopular: boolean
  isActive?: boolean
}

/** 1–3 for the platform's top masters and most active clients (a laurel wreath). */
type Rank = 1 | 2 | 3

type Specialist = {
  id: string
  rank?: Rank | null
  name: string
  role: string
  rating: number | null
  photoUrl?: string | null
  /** null = works at every branch. */
  branchId?: string | null
  serviceIds: string[]
  isActive?: boolean
  /** Cabinet only: the master's sign-in number. */
  phone?: string
  /** Cabinet only: the master's share of their visits' revenue, %. */
  commissionPercent?: number | null
}

type Branch = {
  id: string
  name: string
  address: string
  phone: string
  latitude: number | null
  longitude: number | null
  isActive?: boolean
}

type BranchInput = Omit<Branch, 'id' | 'isActive'> & { isActive: boolean }

type MapPlace = {
  branchId: string
  branchName: string
  address: string
  latitude: number
  longitude: number
  slug: string
  name: string
  kind: BusinessKind
  coverUrl: string | null
  /** The owner's logo (square); null = the tinted monogram. */
  logoUrl?: string | null
  minPrice: number
  distanceKm: number | null
}

type BusinessKind = 'beauty' | 'barber' | 'nails' | 'spa' | 'health' | 'other'

type WorkingDay = {
  weekday: number
  opensMinutes: number
  closesMinutes: number
}

type Business = {
  id: string
  slug: string
  name: string
  kind: BusinessKind
  description: string
  city: string
  address: string
  phone: string
  whatsapp: string
  mapUrl: string
  slotMinutes: number
  coverUrl: string | null
  /** The owner's logo (square); null = the tinted monogram. */
  logoUrl?: string | null
  photos: string[]
  branches: Branch[]
  isPublished: boolean
  hours: WorkingDay[]
}

/** What creating or saving the business profile returns: no photos or branches. */
type BusinessProfile = Omit<Business, 'photos' | 'branches'>

type BusinessCard = Pick<
  Business,
  'slug' | 'name' | 'kind' | 'description' | 'city' | 'address'
> & {
  servicesCount: number
  minPrice: number
  coverUrl: string | null
  /** The owner's logo (square); null = the tinted monogram. */
  logoUrl?: string | null
  /** The average of real reviews; null until the first one. */
  rating?: number | null
  reviewsCount?: number
  hours: WorkingDay[]
}

type Offer = {
  id: string
  name: string
  price: number
  durationMinutes: number
  isPopular: boolean
  slug: string
  businessName: string
  kind: BusinessKind
  coverUrl: string | null
  /** The owner's logo (square); null = the tinted monogram. */
  logoUrl?: string | null
  rating: number | null
  address: string | null
  /** The biggest open promotion on this service, percent; null = none. */
  discountPercent?: number | null
}

/** A service picked for this client, with why («Пора снова», «Вы любите маникюр»). */
type Recommendation = Offer & { reason: string }

type PopularService = {
  name: string
  places: number
  minPrice: number
  durationMinutes: number
}

type NextFree = Record<string, { date: string; time: string } | null>

type BusinessPage = {
  business: Business
  catalog: Catalog
  /** Cabinet only: the viewer's role; staff (administrators) see no money or setup. */
  role?: 'owner' | 'staff'
}

type TeamMember = { id: string; phone: string; name: string; role: 'owner' | 'admin' }

type BusinessLink = Pick<
  Business,
  'slug' | 'name' | 'kind' | 'isPublished' | 'coverUrl' | 'logoUrl'
> & {
  role: 'owner' | 'staff' | 'admin'
  todayCount: number
  next: { date: string; time: string } | null
}

type BookingBusiness = Pick<Business, 'slug' | 'name' | 'address' | 'phone' | 'mapUrl'>

type Catalog = {
  categories: Category[]
  services: Service[]
  specialists: Specialist[]
}

type TimeSlot = {
  time: string
  isAvailable: boolean
}

type Availability = {
  date: string
  slots: TimeSlot[]
}

type BookingStatus = 'confirmed' | 'cancelled'

type Booking = {
  id: string
  status: BookingStatus
  serviceId: string
  serviceName: string
  price: number
  durationMinutes: number
  specialistId: string
  specialistName: string
  date: string
  time: string
  startsAt: string
  /** Missing in bookings saved on the device before reviews existed. */
  endsAt?: string
  customerName: string
  /** The promotion the visit got; the client pays price − discount.amount. */
  discount?: { title: string; amount: number } | null
  /** A deposit for online booking; pending = the slot is held until it is paid. */
  payment?: BookingPayment | null
  review?: { rating: number; comment: string; reply: string | null } | null
  /** The salon marked «Не пришёл»: nothing to rate. */
  isNoShow?: boolean
  business: BookingBusiness
}

type BookingPayment = {
  status: 'pending' | 'paid' | 'refunded' | 'kept' | 'expired'
  amount: number
  dueAt: string | null
}

// The pay page (`GET /payments/:id?s=`).
type PaymentPage = {
  id: string
  amount: number
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  driver: 'none' | 'test' | 'freedompay'
  /** The acquirer's own page (Freedom Pay); null for the test driver, which pays here. */
  checkoutUrl: string | null
  booking: {
    id: string
    serviceName: string
    specialistName: string
    date: string
    time: string
    price: number
    paymentStatus: BookingPayment['status'] | null
    dueAt: string | null
    business: { name: string; slug: string }
  }
}

type Review = {
  id: string
  rating: number
  comment: string
  authorName: string
  reply: string | null
  repliedAt: string | null
  createdAt: string
  specialistName: string
  serviceName: string
  serviceId?: string | null
  /** The author's public profile (`GET /reviewers/:id`); null for very old visits. */
  authorId?: string | null
  authorRank?: Rank | null
  authorAvatarUrl?: string | null
  /** Up to three pictures the client added to the review. */
  photos?: string[]
}

// Another client's public page: their reviews across places.
type ReviewerProfile = {
  id: string
  name: string
  avatarUrl: string | null
  count: number
  average: number
  places: number
  since: string
  items: (Review & { business: { slug: string; name: string; coverUrl: string | null } })[]
}

type ProfileBadge = { id: string; title: string; description: string }

// A client's public profile (`GET /profiles/:id`, page `/u/<id>`).
type PublicProfile = {
  id: string
  name: string
  avatarUrl: string | null
  banner: string
  accent: string
  status: string
  statusEmoji: string
  /** The short address (`/u/<handle>`); null = the public id. */
  handle: string | null
  /** Friends invited by this client who have come. */
  friends: number
  about: string
  /** Achievements the client chose to show by the name (earned ones). */
  featured: (ProfileBadge & { earned: boolean })[]
  favoriteMaster: {
    id: string
    name: string
    photoUrl: string | null
    role: string
    slug: string
    businessName: string
    visits: number
    rank: Rank | null
  } | null
  isOwn: boolean
  links?: ProfileLink[]
  /** The owner's ended visits of the last two weeks without a review (0 for others). */
  awaitingReview?: number
  isPublic: boolean
  since: string
  level: { level: number; xp: number; next: number | null; progress: number }
  rank: Rank | null
  badges: ProfileBadge[]
  /** Every achievement: earned ones and goals with progress. */
  achievements: (ProfileBadge & {
    earned: boolean
    progress: { current: number; target: number }
  })[]
  stats: {
    visits: number
    places: number
    reviews: number
    average: number | null
    friends: number
  }
  places: {
    slug: string
    name: string
    logoUrl: string | null
    coverUrl: string | null
    visits: number
  }[]
  masters: {
    id: string
    name: string
    photoUrl: string | null
    role: string
    slug: string
    businessName: string
    visits: number
    rank: Rank | null
  }[]
  reviews: {
    id: string
    rating: number
    photos?: string[]
    comment: string
    reply: string | null
    createdAt: string
    serviceName: string
    specialistName: string
    business: { slug: string; name: string; logoUrl: string | null; coverUrl: string | null }
  }[]
}

// One master on the leaderboard (`GET /rankings/masters`, page `/top`).
type LeaderboardMaster = {
  place: number
  /** The platform-wide wreath (1–3), whatever the kind. */
  rank: Rank | null
  id: string
  name: string
  role: string
  photoUrl: string | null
  average: number
  reviews: number
  visits30d: number
  business: { slug: string; name: string; logoUrl: string | null }
}

// One place on the places' leaderboard (`GET /rankings/places`).
type LeaderboardPlace = {
  place: number
  slug: string
  name: string
  logoUrl: string | null
  coverUrl: string | null
  address: string | null
  average: number
  reviews: number
  visits30d: number
}

// The signed-in client's own profile look (`GET|PATCH /me/profile`).
type ProfileSettings = {
  id: string
  banner: string
  accent: string
  status: string
  statusEmoji: string
  handle: string | null
  about: string
  /** Handles (Instagram, Telegram, TikTok) and a website address. */
  links: Partial<Record<ProfileLinkKind, string>>
  featuredBadges: string[]
  favoriteMasterId: string | null
  isPublic: boolean
  showPlaces: boolean
}

type ProfileLinkKind = 'instagram' | 'telegram' | 'tiktok' | 'website'

/** A link on a public profile, built by the API from a handle: never an arbitrary URL. */
type ProfileLink = { kind: ProfileLinkKind; label: string; text: string; url: string }

type ManagedReview = Review & { customerPhone: string; visitDate: string | null }

// «Вопросы» on a business page: asked by a signed-in client, answered by the place.
type BusinessQuestion = {
  id: string
  authorName: string
  text: string
  answer: string | null
  answeredAt: string | null
  createdAt: string
}

type QuestionList = { count: number; items: BusinessQuestion[] }

type ReviewSummary<Item = Review> = {
  count: number
  average: number
  distribution: { stars: number; count: number }[]
  items: Item[]
}

type VisitReview = { visit: Booking; canReview: boolean }

type ReviewAccess = { token?: string | null; signature?: string | null }

type MasterSchedule = {
  hasOwnHours: boolean
  hours: WorkingDay[]
  leaves: { id: string; startsOn: string; endsOn: string; reason: string }[]
}

type TelegramStatus = {
  isAvailable: boolean
  botUsername: string | null
  chats: { id: string; username: string; createdAt: string }[]
}

// With a deposit the response carries the checkout to send the client to.
type CreatedBooking = Booking & { cancelToken: string; checkoutUrl?: string }

type Customer = {
  id: string
  phone: string
  name: string
  isAdmin: boolean
  avatarUrl?: string | null
  /** From `GET /me`: places this account runs (cabinet shortcut) and where it is a master. */
  businesses?: { slug: string; name: string; role: 'owner' | 'staff' }[]
  masterOf?: { slug: string; name: string }[]
}

type OtpChannel = 'telegram' | 'sms'

type OtpRequest = {
  phone: string
  channel: OtpChannel
  resendAfterSeconds: number
}

/** `GET /auth/telegram`: whether «Войти через Telegram» can be offered, and the bot to open. */
type TelegramLoginConfig = {
  isAvailable: boolean
  botUsername: string | null
}

/**
 * `POST /auth/telegram/check`: waiting for the number in the bot, signed in (the session cookie
 * is set), or gone (expired, already used, unknown) — start again.
 */
type TelegramLoginState =
  | { status: 'pending' | 'expired' }
  | { status: 'signedIn'; customer: Customer }

type VisitOutcome = 'arrived' | 'no_show'

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'subscription' | 'certificate'

type AdminBooking = Booking & {
  customerPhone: string
  comment: string
  outcome?: VisitOutcome | null
  paidAmount?: number | null
  paymentMethod?: PaymentMethod | null
  subscriptionId?: string | null
  certificateCode?: string | null
  certificateAmount?: number | null
  bonusAmount?: number | null
}

type GiftCertificate = {
  id: string
  code: string
  amount: number
  balance: number
  recipient: string
  phone: string | null
  expiresOn: string | null
  createdAt: string
}

type SubscriptionPlan = {
  id: string
  title: string
  /** null = any service. */
  serviceId: string | null
  serviceName: string | null
  visits: number
  price: number
  validDays: number
  isActive: boolean
}

type SubscriptionPlanInput = Omit<SubscriptionPlan, 'id' | 'serviceName'>

type ClientSubscription = {
  id: string
  title: string
  serviceId: string | null
  serviceName: string | null
  visitsTotal: number
  visitsLeft: number
  expiresOn: string
}

// The cabinet's «Лояльность» tab.
type LoyaltyOverview = {
  bonusPercent: number | null
  plans: SubscriptionPlan[]
  certificates: GiftCertificate[]
}

// A client's card in the cabinet.
type ClientLoyalty = {
  bonusPercent: number | null
  bonusBalance: number
  subscriptions: ClientSubscription[]
  certificates: GiftCertificate[]
}

// A signed-in client's bonuses and subscriptions per place.
type MyLoyalty = {
  slug: string
  name: string
  bonusBalance: number
  subscriptions: { title: string; visitsLeft: number; visitsTotal: number; expiresOn: string }[]
}[]

type OutcomeInput = {
  outcome: VisitOutcome | null
  paidAmount?: number | null
  paymentMethod?: PaymentMethod | null
  /** Loyalty drawn on for an «arrived» visit; each is used at most once per visit. */
  subscriptionId?: string | null
  certificateCode?: string | null
  certificateAmount?: number | null
  bonusAmount?: number | null
}

type ClientListItem = {
  phone: string
  name: string
  visits: number
  noShows: number
  spent: number
  lastVisit: string | null
  nextVisit: string | null
  hasNote: boolean
}

type ClientCard = {
  phone: string
  name: string
  note: string
  birthday: string | null
  stats: {
    visits: number
    noShows: number
    cancellations: number
    spent: number
    averageCheck: number
    firstVisit: string | null
    lastVisit: string | null
    nextVisit: string | null
    favoriteService: string | null
    favoriteMaster: string | null
  }
  history: {
    id: string
    date: string
    time: string
    status: string
    outcome: VisitOutcome | null
    paidAmount: number | null
    paymentMethod: PaymentMethod | null
    price: number
    serviceName: string
    specialistName: string
    rating: number | null
    reviewComment: string | null
  }[]
}

type RecentBooking = AdminBooking & { createdAt: string }

type MovedBooking = Booking & {
  previous: { date: string; time: string; specialistId: string }
}

type TimeOff = {
  id: string
  specialistId: string
  date: string
  from: string
  to: string
  reason: string
}

type AdminSchedule = {
  date: string
  specialists: (Pick<Specialist, 'id' | 'name' | 'role' | 'branchId'> & {
    /** The master's working time that day inside the business hours; null = not working. */
    hours?: { opensMinutes: number; closesMinutes: number } | null
    isOnLeave?: boolean
    leaveReason?: string | null
  })[]
  bookings: AdminBooking[]
  timeOff: TimeOff[]
}

type CreateTimeOffInput = Omit<TimeOff, 'id'>

type CreatedTimeOff = {
  timeOff: TimeOff
  conflictingBookingIds: string[]
}

type CreateBusinessInput = Pick<
  Business,
  'name' | 'slug' | 'kind' | 'city' | 'address' | 'phone'
> & {
  services: { name: string; durationMinutes: number; price: number; isPopular: boolean }[]
}

type UpdateBusinessInput = Partial<
  Pick<
    Business,
    | 'name'
    | 'kind'
    | 'description'
    | 'city'
    | 'address'
    | 'phone'
    | 'whatsapp'
    | 'mapUrl'
    | 'slotMinutes'
    | 'isPublished'
  >
>

type ServiceInput = Pick<
  Service,
  'categoryId' | 'name' | 'description' | 'durationMinutes' | 'price' | 'isPopular'
> & { isActive: boolean; deposit: number | null; rebookDays: number | null }

type SpecialistInput = Pick<Specialist, 'name' | 'role' | 'serviceIds'> & {
  isActive: boolean
  branchId: string | null
  /** The number the master signs in with for «Мой день»; empty = no access. */
  phone: string
  commissionPercent: number | null
}

type MasterPlace = {
  slug: string
  businessName: string
  specialistId: string
  name: string
  role: string
}

type MasterDay = {
  date: string
  business: { slug: string; name: string }
  master: { id: string; name: string; role: string; commissionPercent: number | null }
  hours: { opensMinutes: number; closesMinutes: number } | null
  leaveReason: string | null
  bookings: AdminBooking[]
}

type SlugCheck = { available: boolean; reason?: string }

type CreateBookingInput = {
  serviceId: string
  specialistId: string
  date: string
  time: string
  name: string
  phone: string
  /** A signed-in client booking someone else: `name` and `phone` are theirs. */
  forOther?: boolean
  comment: string
  branchId?: string
  smsConfirmation?: boolean
  reminderMinutes?: 60 | 120 | 1440 | null
  promoCode?: string
  /** Who invited this client (`?ref=` from a profile link). */
  ref?: string
}

type PromotionKind = 'happy_hours' | 'first_visit' | 'promo_code'

// A business's promotion as the cabinet edits it.
type Promotion = {
  id: string
  title: string
  kind: PromotionKind
  percent: number
  code: string | null
  /** happy_hours: 0 = Monday; null = every day. */
  weekdays: number[] | null
  fromMinutes: number | null
  toMinutes: number | null
  /** null = every service. */
  serviceIds: string[] | null
  startsOn: string | null
  endsOn: string | null
  isActive: boolean
}

type PromotionInput = Omit<Promotion, 'id'>

// What a client may see on the business page (no codes).
type PublicPromotion = Pick<
  Promotion,
  | 'id'
  | 'title'
  | 'kind'
  | 'percent'
  | 'weekdays'
  | 'fromMinutes'
  | 'toMinutes'
  | 'serviceIds'
  | 'endsOn'
>

type PriceQuote = {
  price: number
  discount: { promotionId: string; title: string; percent: number; amount: number } | null
  total: number
}

type StockItem = {
  id: string
  name: string
  unit: string
  quantity: number
  unitCost: number
  minQuantity: number | null
  isLow: boolean
  /** How much one visit of a service uses. */
  materials: { serviceId: string; amount: number }[]
}

type StockItemInput = {
  name: string
  unit: string
  unitCost: number
  minQuantity: number | null
  materials: { serviceId: string; amount: number }[]
}

/** Rows count from 1 without the header line. */
type ImportReport = {
  imported: number
  skippedCount: number
  skipped: { row: number; reason: string }[]
}

/** A photo of finished work in the cabinet: what it shows and whether the feed may show it. */
type WorkPhoto = {
  id: string
  url: string
  serviceId: string | null
  serviceName: string | null
  specialistId: string | null
  specialistName: string | null
  isHidden: boolean
  reports: number
  createdAt: string
}

type WorkPhotoInput = Pick<WorkPhoto, 'serviceId' | 'specialistId' | 'isHidden'>

type FeedItem = {
  id: string
  url: string
  createdAt: string
  business: { slug: string; name: string; kind: BusinessKind; address: string }
  service: { id: string; name: string; price: number; durationMinutes: number } | null
  specialist: { id: string; name: string; photoUrl: string | null } | null
  distanceKm: number | null
  /** Likes from devices («Нравится»); the feed is cached, so a fresh like adds on the client. */
  likes?: number
  /** Reviews of this service with this master (or the service at the place). */
  reviewsCount?: number
}

type FeedPage = { items: FeedItem[]; nextOffset: number | null }

type AnalyticsDays = 7 | 30 | 90 | 365

type AnalyticsReport = {
  period: { days: AnalyticsDays; from: string; to: string }
  totals: {
    revenue: number
    revenueChange: number | null
    visits: number
    visitsChange: number | null
    averageCheck: number
    averageCheckChange: number | null
    clients: number
    newClients: number
    returningClients: number
    cancellationRate: number
    noShows: number
    noShowRate: number
    payments: { cash: number; card: number; transfer: number; unmarked: number }
    upcomingVisits: number
    upcomingRevenue: number
    materialsCost: number
    margin: number
  }
  daily: { date: string; visits: number; revenue: number; cancelled: number }[]
  services: { id: string; name: string; visits: number; revenue: number; materialsCost: number }[]
  masters: {
    id: string
    name: string
    role: string
    visits: number
    revenue: number
    load: number
    percent: number | null
    payout: number | null
  }[]
  clients: {
    phone: string
    name: string
    visits: number
    revenue: number
    lastVisit: string
    isNew: boolean
  }[]
  heatmap: { weekday: number; hour: number; visits: number }[]
}

// «Сообщить, когда освободится»: a client waits for a full day (see apps/api/src/waitlist).
type WaitlistEntry = {
  id: string
  status: 'waiting' | 'notified' | 'cancelled' | 'expired'
  date: string
  /** The free time the SMS named, once it went out. */
  notifiedTime: string | null
  service: { id: string; name: string }
  specialist: { id: string; name: string } | null
  business: { name: string; slug: string }
}

// The cabinet's view of an entry: who waits, with their number.
type ManagedWaitlistEntry = WaitlistEntry & {
  customerName: string
  customerPhone: string
  createdAt: string
}

type JoinWaitlistInput = {
  serviceId: string
  specialistId: string
  branchId?: string
  date: string
  name: string
  phone: string
}

type MailingSegment = 'lapsed' | 'birthday' | 'all'

type MailingsOverview = {
  history: {
    id: string
    segment: MailingSegment
    lapsedDays: number | null
    text: string
    recipients: number
    createdAt: string
  }[]
  birthdayGreeting: string | null
}

// Funnel telemetry (POST /telemetry/events): which step of which scenario a device reached —
// never what anyone typed. A step belongs to exactly one flow; the API works the flow out.
type FunnelFlow =
  | 'booking'
  | 'search'
  | 'login'
  | 'manage_booking'
  | 'prepayment'
  | 'waitlist'
  | 'review'
  | 'owner'
  | 'signals'

type FunnelStep =
  // booking
  | 'catalog'
  | 'business'
  | 'booking_open'
  | 'service'
  | 'specialist'
  | 'time'
  | 'contacts'
  | 'booked'
  // search
  | 'search_open'
  | 'search_typed'
  | 'search_results'
  | 'search_pick'
  // login
  | 'login_open'
  | 'otp_sent'
  | 'otp_ok'
  | 'login_done'
  // manage_booking
  | 'ticket_open'
  | 'reschedule_open'
  | 'reschedule_done'
  | 'cancel'
  | 'cancel_undone'
  // prepayment
  | 'deposit_shown'
  | 'checkout_open'
  | 'pay_click'
  | 'paid'
  // waitlist
  | 'full_day_shown'
  | 'waitlist_open'
  | 'waitlist_joined'
  // review
  | 'review_open'
  | 'review_rated'
  | 'review_sent'
  // owner
  | 'business_landing'
  | 'register_name'
  | 'register_kind'
  | 'register_contacts'
  | 'register_done'
  // signals: trouble, not progress
  | 'form_error'
  | 'toast_action'
  | 'search_empty'
  | 'otp_error'
  | 'pay_failed'

/** Short codes only (`phone`, `sms`, `undo_cancel`): never a value a person typed. */
type FunnelEventMeta = { field?: string; channel?: string; kind?: string }

type FunnelEvent = { step: FunnelStep; slug?: string; meta?: FunnelEventMeta }

/** A coarse picture of the device and its settings, the same for everyone who has them. */
type DeviceProfile = {
  type: 'phone' | 'tablet' | 'desktop'
  os: 'ios' | 'android' | 'other'
  app: 'web' | 'native'
  /** The browser's own font size: normal, large (≥ 120%) or huge (≥ 175%). */
  textScale: 'normal' | 'large' | 'huge'
  /** `slow` for 2G/3G or «save data», `unknown` where the browser does not say. */
  net: 'slow' | 'fast' | 'unknown'
  lang: 'ru' | 'ky' | 'en'
  reducedMotion: boolean
  contrastMore: boolean
  dark: boolean
}

type FunnelEventsInput = { session: string; events: FunnelEvent[]; device?: DeviceProfile }

type FunnelRow = {
  step: FunnelStep
  sessions: number
  /** Share of sessions kept from the step before, %; null for the first step. */
  fromPrevious: number | null
  /** Share of the flow's first step, %. */
  fromStart: number | null
}

type FunnelSegment = Partial<Pick<DeviceProfile, 'type' | 'os' | 'app' | 'textScale' | 'net'>>

type FunnelReport = { days: number; flow: FunnelFlow; segment: FunnelSegment; steps: FunnelRow[] }

type FunnelSignalsReport = {
  days: number
  items: { step: FunnelStep; value: string | null; count: number; sessions: number }[]
}

type FunnelSegmentsReport = {
  days: number
  sessions: number
  items: { dimension: keyof FunnelSegment; value: string; sessions: number }[]
}

// Small answers named once, so the API and the web read the same shape.
type FeedLikes = { likes: number }

type WalletConfig = { apple: boolean; google: boolean }

type WalletLinks = { apple: string | null; google: string | null }

type ReviewPhotos = { photos: string[] }

type CreatedReview = Review & { slug: string }

type ReviewReply = { id: string; reply: string | null }

type ClientNote = { phone: string; note: string; birthday: string | null }

type CreatedLeave = { leave: MasterSchedule['leaves'][number]; conflictingBookings: number }

type ClosedDay = { ids: string[] }

type UnclosedDays = { total: number; days: { date: string; count: number }[] }

type TelegramLink = { url: string; code: string }

type CreatedId = { id: string }

type PaymentsConfig = { isAvailable: boolean; driver: string }

type TestPaymentResult = { bookingId: string; paymentStatus: string | null }

type PaymentSync = { bookingId: string; status: string; paymentStatus: string | null }

type CheckoutLink = { url: string }

type BookingTelegramLink = { url: string | null; isLinked: boolean }

type LoyaltySettings = { bonusPercent: number | null }

type MailingPreview = { count: number; names: string[] }

type MailingSent = { recipients: number }

type BirthdayGreeting = { text: string | null }

type CoverUpload = { coverUrl: string }

type LogoUpload = { logoUrl: string }

type SpecialistPhotoUpload = { photoUrl: string }

type AvatarUpload = { avatarUrl: string }

type UploadedPhoto = { url: string }

type SearchCorrection = { query: string; corrected: string | null }

export type {
  DeviceProfile,
  FunnelEvent,
  FunnelEventMeta,
  FunnelEventsInput,
  FunnelFlow,
  FunnelReport,
  FunnelRow,
  FunnelSegment,
  FunnelSegmentsReport,
  FunnelSignalsReport,
  FunnelStep,
  TelegramLoginConfig,
  TelegramLoginState,
  AvatarUpload,
  BirthdayGreeting,
  BookingTelegramLink,
  CheckoutLink,
  ClientNote,
  ClosedDay,
  CoverUpload,
  CreatedId,
  CreatedLeave,
  CreatedReview,
  FeedLikes,
  LogoUpload,
  LoyaltySettings,
  MailingPreview,
  MailingSent,
  PaymentSync,
  PaymentsConfig,
  ReviewPhotos,
  ReviewReply,
  SearchCorrection,
  SpecialistPhotoUpload,
  TelegramLink,
  TestPaymentResult,
  UnclosedDays,
  UploadedPhoto,
  WalletConfig,
  WalletLinks,
  BusinessProfile,
  ProfileLink,
  ProfileLinkKind,
  BusinessQuestion,
  QuestionList,
  AdminBooking,
  MasterDay,
  MasterPlace,
  MasterSchedule,
  ClientCard,
  ClientListItem,
  ClientLoyalty,
  ClientSubscription,
  GiftCertificate,
  LoyaltyOverview,
  MailingSegment,
  MailingsOverview,
  MyLoyalty,
  OutcomeInput,
  SubscriptionPlan,
  SubscriptionPlanInput,
  TeamMember,
  PaymentMethod,
  VisitOutcome,
  ManagedReview,
  Review,
  ReviewAccess,
  ReviewSummary,
  ReviewerProfile,
  ProfileBadge,
  LeaderboardMaster,
  LeaderboardPlace,
  Rank,
  ProfileSettings,
  PublicProfile,
  TelegramStatus,
  VisitReview,
  AnalyticsDays,
  AnalyticsReport,
  Offer,
  PopularService,
  Branch,
  BranchInput,
  MapPlace,
  MovedBooking,
  NextFree,
  RecentBooking,
  BookingBusiness,
  Business,
  BusinessCard,
  BusinessKind,
  BusinessLink,
  BusinessPage,
  CreateBusinessInput,
  ServiceInput,
  SlugCheck,
  SpecialistInput,
  UpdateBusinessInput,
  WorkingDay,
  AdminSchedule,
  Availability,
  Booking,
  BookingStatus,
  Catalog,
  Category,
  CreateBookingInput,
  BookingPayment,
  CreatedBooking,
  CreatedTimeOff,
  CreateTimeOffInput,
  Customer,
  OtpChannel,
  OtpRequest,
  Service,
  Specialist,
  TimeOff,
  TimeSlot,
  JoinWaitlistInput,
  ManagedWaitlistEntry,
  PaymentPage,
  PriceQuote,
  Promotion,
  PromotionInput,
  PromotionKind,
  PublicPromotion,
  ImportReport,
  Recommendation,
  FeedItem,
  FeedPage,
  WorkPhoto,
  WorkPhotoInput,
  StockItem,
  StockItemInput,
  WaitlistEntry,
}
