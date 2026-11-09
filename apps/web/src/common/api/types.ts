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
  serviceIds: string[]
  isActive?: boolean
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

type NextFree = Record<string, { date: string; time: string } | null>

type BusinessPage = {
  business: Business
  catalog: Catalog
}

type BusinessLink = Pick<Business, 'slug' | 'name' | 'isPublished'>

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
  customerName: string
  business: BookingBusiness
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

type AdminBooking = Booking & {
  customerPhone: string
  comment: string
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
  specialists: Pick<Specialist, 'id' | 'name' | 'role'>[]
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

type SpecialistInput = Pick<Specialist, 'name' | 'role' | 'serviceIds'> & { isActive: boolean }

type SlugCheck = { available: boolean; reason?: string }

type CreateBookingInput = {
  serviceId: string
  specialistId: string
  date: string
  time: string
  name: string
  phone: string
  comment: string
}

export type {
  AdminBooking,
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
