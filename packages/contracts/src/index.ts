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
type Recommendation = Offer & {
  reason: string
  /** One id per answer of GET /recommendations: events carry it, so a shown list can be rebuilt. */
  requestId: string
  /** The scorer that made the list («score-v1»): versions are compared by it. */
  algorithm: string
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

// One service of a visit; a visit may have several, done one after another by one master.
type BookingService = {
  id: string
  name: string
  price: number
  durationMinutes: number
}

type Booking = {
  id: string
  status: BookingStatus
  /** The visit's first service. */
  serviceId: string
  /** Every service's name joined with « + » («Маникюр + Педикюр»). */
  serviceName: string
  /** The whole visit: every service added up. */
  price: number
  durationMinutes: number
  /** Every service of the visit in order, the first one included. Missing in old device copies. */
  services?: BookingService[]
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

type ManagedReview = Review & {
  customerPhone: string
  visitDate: string | null
  /** The reply was sent by the automatic reply to good reviews, not written by the owner. */
  isAutoReply?: boolean
  /** A poor review the owner has settled with the client (ISO), else null. */
  resolvedAt?: string | null
}

/**
 * `GET|PUT /manage/:slug/reviews/settings`: answering without writing each reply by hand. Templates
 * take `{имя}` (the client's first name), `{мастер}` (the master's first name) and `{услуга}`.
 */
type ReviewReplySettings = {
  autoReply: {
    isEnabled: boolean
    /** Reviews from this rating up get the automatic reply (an hour after they arrive). */
    minRating: 4 | 5
    template: string
  }
  /** Offered above the reply field, up to six. */
  quickReplies: string[]
}

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
  /** The cabinet only: reviews still without the owner's reply (all of them, not just loaded). */
  unanswered?: number
  /** The cabinet only: unanswered reviews without words, from 5 ★ and from 4 ★ up, answered in bulk. */
  quietUnanswered?: { fiveStars: number; fourAndUp: number }
}

/** `POST /manage/:slug/reviews/bulk-reply`: how many unanswered reviews without words got it. */
type BulkReplyResult = { count: number }

/** `PUT /manage/:slug/reviews/:id/resolved`. */
type ReviewResolution = { id: string; resolvedAt: string | null }

/** `GET /master/:slug/reviews`: what clients said about the signed-in master. */
type MasterReviews = {
  count: number
  average: number | null
  /** The latest twenty, newest first. */
  items: Review[]
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

/** `GET /session`: the signed-in account, or null for a guest (200 either way). */
type Session = { customer: Customer | null }

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
  /** YYYY-MM-DD from the client's card. */
  birthday: string | null
}

/** The groups an owner acts on (see apps/api/src/clients/client-segments.ts). */
type ClientSegment = 'all' | 'upcoming' | 'new' | 'regular' | 'lapsed' | 'noShows' | 'birthday'
type ClientSort = 'recent' | 'spent' | 'visits' | 'name'

/** `GET /manage/:slug/clients?q&segment&sort`: up to 200 of one segment, and every segment's size. */
type ClientList = {
  items: ClientListItem[]
  counts: Record<ClientSegment, number>
  /** How many days without a visit make «давно не были». */
  lapsedDays: number
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
  specialists: (Pick<Specialist, 'id' | 'name' | 'role' | 'branchId' | 'photoUrl'> & {
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
  /** Kept for older callers: «Зарплата» saves the whole scheme through `MasterPayScheme`. */
  commissionPercent?: number | null
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
  master: { id: string; name: string; role: string }
  /** What the master earned: this day, and the month so far (null when no pay is set). */
  pay: MasterDayPay | null
  hours: { opensMinutes: number; closesMinutes: number } | null
  leaveReason: string | null
  bookings: AdminBooking[]
}

type SlugCheck = { available: boolean; reason?: string }

type CreateBookingInput = {
  serviceId: string
  /** Services done in the same visit after `serviceId`, by the same master, one after another. */
  extraServiceIds?: string[]
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
  /** Sold to clients at the counter, at `salePrice`. */
  isForSale: boolean
  salePrice: number | null
}

type StockItemInput = {
  name: string
  unit: string
  unitCost: number
  minQuantity: number | null
  materials: { serviceId: string; amount: number }[]
  isForSale?: boolean
  salePrice?: number | null
}

/** A stock delivery; `expense` also records what it cost as an expense («Закупка материалов»). */
type StockReceiveInput = {
  quantity: number
  unitCost?: number
  expense?: { branchId: string | null } | null
}

/** Money that changes hands at the counter. */
type SalePaymentMethod = 'cash' | 'card' | 'transfer'

type SaleItem = { itemId: string | null; name: string; quantity: number; price: number }

type Sale = {
  id: string
  createdAt: string
  branchId: string | null
  bookingId: string | null
  customerPhone: string | null
  customerName: string | null
  /** The master who sold it, for a commission later. */
  sellerId: string | null
  sellerName: string | null
  paymentMethod: SalePaymentMethod
  total: number
  items: SaleItem[]
  isCancelled: boolean
  /** The latest fiscal receipt of the sale (its refund once cancelled); null without receipts. */
  receipt: FiscalReceipt | null
}

type SaleInput = {
  /** Sold together with this visit: its branch, client and master by default. */
  bookingId?: string | null
  branchId?: string | null
  customerPhone?: string | null
  customerName?: string | null
  sellerId?: string | null
  paymentMethod: SalePaymentMethod
  items: { itemId: string; quantity: number }[]
}

type CashMovement = {
  id: string
  kind: 'in' | 'out'
  amount: number
  reason: string
  createdAt: string
}

/** One branch's till for a shift: what should be in it now (or was at closing). */
type CashShift = {
  id: string
  branchId: string
  openedAt: string
  openedBy: string | null
  openingCash: number
  closedAt: string | null
  closedBy: string | null
  countedCash: number | null
  note: string | null
  /** Cash paid for visits of the branch on the shift's days. */
  visitsCash: number
  /** Cash paid for products during the shift. */
  salesCash: number
  cashIn: number
  cashOut: number
  /** Opening + visits + sales + in − out. */
  expectedCash: number
  /** Counted − expected, once closed. */
  difference: number | null
  movements: CashMovement[]
}

type CashDesk = {
  /** The open shift per branch (none: the business works without shifts). */
  open: CashShift[]
  /** Closed shifts, newest first (10). */
  closed: CashShift[]
  /** Today's sales, newest first. */
  sales: Sale[]
  /** What can be sold now. */
  products: StockItem[]
}

type OpenShiftInput = { branchId: string; openingCash: number }

/**
 * Fiscal receipts (apps/api/src/fiscal): `log` writes them to the log and numbers them itself
 * (outside production), `off` issues none, `ekassa` sends them to the business's own eKassa.
 */
type FiscalDriverName = 'log' | 'off' | 'ekassa'

/** Общий режим, единый налог, патент (a patent needs no cash register). */
type TaxRegime = 'general' | 'single' | 'patent'

type FiscalSettings = {
  /** What the platform runs; `off` hides receipts everywhere. */
  driver: FiscalDriverName
  isEnabled: boolean
  inn: string | null
  taxRegime: TaxRegime
  isVatPayer: boolean
  /** Percent; VAT counts only for a VAT payer. */
  vatRate: number
  /** Sales tax (НсП) percent on services and on goods. */
  salesTaxServices: number
  salesTaxGoods: number
  /** The business's own login at the provider (eKassa); the password never comes back. */
  login: string | null
  hasPassword: boolean
}

type FiscalSettingsInput = Omit<FiscalSettings, 'driver' | 'hasPassword'> & {
  /** A new password; omitted or null keeps the saved one. */
  password?: string | null
}

type FiscalReceiptStatus = 'pending' | 'sending' | 'issued' | 'failed' | 'cancelled'

type FiscalReceiptLine = {
  name: string
  kind: 'service' | 'goods'
  quantity: number
  price: number
  sum: number
  vatRate: number
  vatAmount: number
  salesTaxRate: number
  salesTaxAmount: number
}

type FiscalReceipt = {
  id: string
  kind: 'sale' | 'refund'
  status: FiscalReceiptStatus
  /** The visit or the sale it is for. */
  bookingId: string | null
  saleId: string | null
  /** A refund's original receipt. */
  refundOf: string | null
  /** A sale receipt that a refund has cancelled. */
  isRefunded: boolean
  businessName: string
  address: string | null
  inn: string | null
  taxRegime: TaxRegime
  payment: 'cash' | 'cashless'
  lines: FiscalReceiptLine[]
  total: number
  vatAmount: number
  salesTaxAmount: number
  fiscalNumber: string | null
  fiscalSign: string | null
  /** The provider's or the tax office's page of this receipt; the QR leads there. */
  providerUrl: string | null
  /** Our own page of the receipt, signed, for the client. */
  viewUrl: string
  /** Issued by the `log` driver: never reached the tax office. */
  isTest: boolean
  error: string | null
  issuedAt: string | null
  createdAt: string
}
type CashMovementInput = { kind: 'in' | 'out'; amount: number; reason: string }
type CloseShiftInput = { countedCash: number; note?: string | null }

/** Preset categories; anything else is the owner's own word. */
type ExpenseCategory =
  | 'rent'
  | 'materials'
  | 'salaries'
  | 'utilities'
  | 'marketing'
  | 'other'
  | (string & {})

type Expense = {
  id: string
  category: ExpenseCategory
  amount: number
  /** YYYY-MM-DD, business time. */
  date: string
  branchId: string | null
  note: string | null
  /** Recorded from a stock delivery. */
  isFromStock: boolean
}

type ExpenseInput = {
  category: ExpenseCategory
  amount: number
  date: string
  branchId: string | null
  note: string | null
}

type ExpenseList = {
  items: Expense[]
  /** Custom categories the business used, beside the presets. */
  categories: string[]
  total: number
}

/** «Прибыль» in analytics: what came in, what went out. */
type MoneyReport = {
  period: { days: AnalyticsDays; from: string; to: string }
  servicesRevenue: number
  productsRevenue: number
  /** Subscriptions sold in the period, counted the day they were sold. */
  subscriptionsRevenue: number
  subscriptionsSold: number
  revenue: number
  /** Materials visits used and the cost of products sold. */
  materialsCost: number
  productsCost: number
  expenses: number
  /** Revenue − materials − products cost − expenses. */
  profit: number
  previousProfit: number
  profitChange: number | null
  expensesByCategory: { category: ExpenseCategory; amount: number }[]
  products: { name: string; quantity: number; revenue: number }[]
  daily: { date: string; revenue: number; expenses: number; profit: number }[]
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

type PayRateKind = 'percent' | 'fixed'
type SalaryKind = 'month' | 'day'

/** How a master is paid; every part is optional and they add up. */
type MasterPayScheme = {
  /** Percent of what the services' visits earned (paid money, or the price minus the discount). */
  percent: number | null
  /** A different percent, or a fixed sum per visit, for some services. */
  rates: { serviceId: string; kind: PayRateKind; value: number }[]
  /** A fixed salary per month (counted per calendar day) or per working day of the schedule. */
  salary: { kind: SalaryKind; amount: number } | null
  /** Guaranteed per month (counted per calendar day): pay is the larger of it and the earned. */
  minimum: number | null
}

type MasterPayout = {
  id: string
  specialistId: string
  amount: number
  /** The period it pays for, YYYY-MM-DD. */
  from: string
  to: string
  paidOn: string
  note: string
}

type MasterPayoutInput = Omit<MasterPayout, 'id'>

type MasterPayLine = {
  serviceId: string
  name: string
  visits: number
  /** What the visits earned. */
  base: number
  /** The rate used; null = no percent set for this service. */
  kind: PayRateKind | null
  rate: number | null
  amount: number
}

type MasterPay = {
  /** From the services. */
  services: number
  lines: MasterPayLine[]
  salary: number
  salaryKind: SalaryKind | null
  /** Working days of the schedule in the period (what a daily salary counts). */
  workDays: number
  /** The minimum for the period, null = none. */
  minimum: number | null
  /** services + salary */
  earned: number
  /** max(earned, minimum) */
  total: number
  /** Paid out for periods that touch this one. */
  paid: number
  /** total - paid, never below zero. */
  due: number
  payouts: MasterPayout[]
}

type MasterDayPay = {
  /** The day's services (and a daily salary on a working day). */
  day: number
  /** The month of the day, up to the day or today: everything, salary and minimum included. */
  month: number
  monthFrom: string
  monthTo: string
  /** The master's percent when it alone decides the pay («ваши 40%»), else null. */
  percent: number | null
}

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
  /** The period before, day by day and as long, for side-by-side charts. */
  previousDaily: { date: string; visits: number; revenue: number; cancelled: number }[]
  services: { id: string; name: string; visits: number; revenue: number; materialsCost: number }[]
  masters: {
    id: string
    name: string
    role: string
    visits: number
    revenue: number
    load: number
    /** Reviews of this master in the period and their average (null without reviews). */
    reviews: number
    rating: number | null
    /** The percent of the services in the master's scheme (null = none). */
    percent: number | null
    /** What the master is owed for the period (`pay.total`), null when no pay is set. */
    payout: number | null
    /** How the pay was counted and what was paid out (null when no pay is set). */
    pay: MasterPay | null
    /** What the master's visits earned in the period before, for «why it changed». */
    previousRevenue: number
    /** Of the master's clients from the retention window, the share who came back to them. */
    retention: number | null
    /** Their most booked services in the period, up to three. */
    topServices: { name: string; visits: number }[]
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
  /** What needs the owner now, each with where to act on it (nothing when all is fine). */
  attention: {
    /** Ended visits of the last 30 days nobody marked, and the earliest such day. */
    unmarked: { count: number; firstDate: string | null }
    /** Clients whose last visit was over `days` ago with nothing booked (the mailing's segment). */
    lapsed: { count: number; days: number }
    /** Tomorrow's free working time across the masters, in minutes (null when it is a day off). */
    freeTomorrow: { minutes: number; date: string } | null
    /** Stock items at or under their warning level. */
    lowStock: { count: number; names: string[] }
  }
  /** Money that did not come: no-shows, and client cancellations under 24 hours before. */
  losses: {
    noShows: { count: number; amount: number }
    lateCancellations: { count: number; amount: number }
    /** Clients with two or more no-shows in half a year. */
    repeatNoShows: { phone: string; name: string; count: number }[]
  }
  /** Who comes back: clients of the window `days`..2×`days` ago who returned within `days`. */
  retention: { days: number; clients: number; returned: number; rate: number | null }
  /** Where the period's visits were booked: online, by the staff, imported; and per branch. */
  sources: {
    online: number
    staff: number
    import: number
    branches: { id: string; name: string; visits: number; revenue: number }[]
  }
  /** What each promotion brought in the period, and what loyalty paid. */
  promotions: { id: string; title: string; visits: number; revenue: number; discount: number }[]
  loyalty: {
    bonusSpent: number
    certificateSpent: number
    subscriptionVisits: number
    /** Subscriptions sold in the period and what they brought in. */
    subscriptionsSold: number
    subscriptionsRevenue: number
  }
  /** The calendar month so far against the owner's goal (goal null when none is set). */
  month: {
    label: string
    revenue: number
    goal: number | null
    projected: number
    daysLeft: number
  }
}

/** `PUT /manage/:slug/analytics/goal`: the month's revenue goal, null to clear it. */
type AnalyticsGoal = { goal: number | null }

// A place from the address search (the branch sheet): what goes into «Адрес», the district and
// city under it, and the point for the map.
type GeoPlace = {
  address: string
  area: string
  latitude: number
  longitude: number
}

/** The address at a map point, or null where the provider knows none. */
type GeoReverse = { place: GeoPlace | null }

// What each settings row says on its right, like iOS Settings.
type SettingsSummary = {
  /** People with access to the cabinet, the owner included. */
  team: number
  telegramChats: number
  /** Switched on and within their dates today. */
  activePromotions: number
  /** null = bonuses off. */
  bonusPercent: number | null
  /** Subscription plans on sale. */
  plans: number
  stockItems: number
  /** Items at or under their warning level. */
  lowStock: number
  /** Fiscal receipts switched on in «Касса». */
  isFiscalOn: boolean
  /** Receipts the provider kept refusing: the owner sends them again. */
  failedReceipts: number
}

// The owner's page at a glance, like a professional account's insights: distinct devices that
// opened it and online bookings, this stretch of days and the one before.
type PageStats = {
  days: number
  views: number
  bookings: number
  previousViews: number
  previousBookings: number
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

/** How full each day is: booked minutes against the masters' open minutes (business hours × active masters). */
type ScheduleLoad = { date: string; minutes: number; capacity: number }[]

type TelegramLink = { url: string; code: string }

type CreatedId = { id: string }

type PaymentsConfig = { isAvailable: boolean; driver: string }

/** How clients hear about their visits: `isWhatsappOn` when WhatsApp comes before SMS. */
type ClientMessagingConfig = { isWhatsappOn: boolean }

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

/**
 * Web Push: the server's public VAPID key; `isAvailable` false hides the feature in browsers.
 * `isNativeAvailable`: the app's own pushes (Expo) can be sent, so the switch shows in the app.
 */
type PushConfig = { isAvailable: boolean; publicKey: string | null; isNativeAvailable: boolean }

/** The app's Expo push token (`ExponentPushToken[…]`), saved for the signed-in person. */
type PushTokenInput = { token: string }

/** A browser's push subscription (`PushSubscription.toJSON()`), saved for the signed-in person. */
type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** What the service worker shows; `tag` is the booking id, so one booking never shows twice. */
type PushMessage = { title: string; body: string; url: string; tag: string }

export type {
  PushConfig,
  PushMessage,
  PushSubscriptionInput,
  PushTokenInput,
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
  ClientMessagingConfig,
  ReviewPhotos,
  ReviewReply,
  SearchCorrection,
  SpecialistPhotoUpload,
  TelegramLink,
  TestPaymentResult,
  UnclosedDays,
  ScheduleLoad,
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
  ClientList,
  ClientSegment,
  ClientSort,
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
  MasterDayPay,
  MasterPay,
  MasterPayLine,
  MasterPayout,
  MasterPayoutInput,
  MasterPayScheme,
  PayRateKind,
  SalaryKind,
  AnalyticsGoal,
  PageStats,
  SettingsSummary,
  GeoPlace,
  GeoReverse,
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
  BookingService,
  CreateBookingInput,
  BookingPayment,
  CreatedBooking,
  CreatedTimeOff,
  CreateTimeOffInput,
  Customer,
  Session,
  ReviewReplySettings,
  BulkReplyResult,
  ReviewResolution,
  MasterReviews,
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
  StockReceiveInput,
  SalePaymentMethod,
  SaleItem,
  Sale,
  SaleInput,
  CashMovement,
  CashShift,
  CashDesk,
  OpenShiftInput,
  CashMovementInput,
  CloseShiftInput,
  FiscalDriverName,
  TaxRegime,
  FiscalSettings,
  FiscalSettingsInput,
  FiscalReceiptStatus,
  FiscalReceiptLine,
  FiscalReceipt,
  ExpenseCategory,
  Expense,
  ExpenseInput,
  ExpenseList,
  MoneyReport,
  WaitlistEntry,
}
