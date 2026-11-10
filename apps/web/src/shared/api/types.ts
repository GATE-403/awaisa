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
  review?: { rating: number; comment: string; reply: string | null } | null
  business: BookingBusiness
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

type CreatedBooking = Booking & { cancelToken: string }

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

type PaymentMethod = 'cash' | 'card' | 'transfer'

type AdminBooking = Booking & {
  customerPhone: string
  comment: string
  outcome?: VisitOutcome | null
  paidAmount?: number | null
  paymentMethod?: PaymentMethod | null
}

type OutcomeInput = {
  outcome: VisitOutcome | null
  paidAmount?: number | null
  paymentMethod?: PaymentMethod | null
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
> & { isActive: boolean }

type SpecialistInput = Pick<Specialist, 'name' | 'role' | 'serviceIds'> & {
  isActive: boolean
  branchId: string | null
  /** The number the master signs in with for «Мой день»; empty = no access. */
  phone: string
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

export type {
  AdminBooking,
  MasterDay,
  MasterPlace,
  MasterSchedule,
  ClientCard,
  ClientListItem,
  OutcomeInput,
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
}
