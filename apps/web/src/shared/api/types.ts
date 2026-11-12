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

type Specialist = {
  id: string
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
  photos: string[]
  branches: Branch[]
  isPublished: boolean
  hours: WorkingDay[]
}

type BusinessCard = Pick<
  Business,
  'slug' | 'name' | 'kind' | 'description' | 'city' | 'address'
> & {
  servicesCount: number
  minPrice: number
  coverUrl: string | null
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
  rating: number | null
  address: string | null
  /** The biggest open promotion on this service, percent; null = none. */
  discountPercent?: number | null
}

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
}

type BusinessLink = Pick<Business, 'slug' | 'name' | 'kind' | 'isPublished' | 'coverUrl'> & {
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
}

type ManagedReview = Review & { customerPhone: string; visitDate: string | null }

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
}

type OtpChannel = 'telegram' | 'sms'

type OtpRequest = {
  phone: string
  channel: OtpChannel
  resendAfterSeconds: number
}

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
  comment: string
  branchId?: string
  smsConfirmation?: boolean
  reminderMinutes?: 60 | 120 | 1440 | null
  promoCode?: string
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
  }
  daily: { date: string; visits: number; revenue: number; cancelled: number }[]
  services: { id: string; name: string; visits: number; revenue: number }[]
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

export type {
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
  PaymentMethod,
  VisitOutcome,
  ManagedReview,
  Review,
  ReviewAccess,
  ReviewSummary,
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
  WaitlistEntry,
}
