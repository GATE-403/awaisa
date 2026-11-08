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
}

type Specialist = {
  id: string
  name: string
  role: string
  rating: number
  serviceIds: string[]
}

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
}

type CreatedBooking = Booking & { cancelToken: string }

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
  Availability,
  Booking,
  BookingStatus,
  Catalog,
  Category,
  CreateBookingInput,
  CreatedBooking,
  Service,
  Specialist,
  TimeSlot,
}
