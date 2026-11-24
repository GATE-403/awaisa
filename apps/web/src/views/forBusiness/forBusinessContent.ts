import { msg } from '@lingui/core/macro'
import type { Booking } from '@/shared/api/types'

// A sample client ticket for the showcase: the same component clients see after booking.
const DEMO_BOOKING: Booking = {
  id: '7a1c2e90-0000-4000-8000-000000000001',
  status: 'confirmed',
  serviceId: 'demo',
  serviceName: "Men's haircut",
  price: 900,
  durationMinutes: 45,
  specialistId: 'demo',
  specialistName: 'Timur',
  date: '2026-11-20',
  time: '14:30',
  startsAt: '2026-11-20T08:30:00.000Z',
  customerName: 'Daniyar',
  business: {
    slug: 'demo',
    name: 'Barber Pro',
    address: '125 Toktogul St',
    phone: '',
    mapUrl: '',
  },
}

const STATS = [
  { value: msg`0 som`, label: msg`a month. No subscription fee, no commission per booking.` },
  { value: msg`5 minutes`, label: msg`to the first booking: name, services, specialists.` },
  { value: msg`2 hours ahead`, label: msg`the client gets a reminder of the visit.` },
  { value: msg`24/7`, label: msg`booking stays open even when the salon is closed.` },
]

const DEMO_SCHEDULE = [
  {
    master: 'Timur',
    tint: 'var(--system-blue)',
    blocks: [
      { top: 0, height: 72, time: '10:00', title: msg`Haircut`, client: 'Azamat' },
      { top: 120, height: 96, time: '12:30', title: msg`Haircut and beard`, client: 'Daniyar' },
    ],
  },
  {
    master: 'Aigerim',
    tint: 'var(--system-pink)',
    blocks: [
      { top: 40, height: 120, time: '10:30', title: msg`Colouring`, client: 'Alina' },
      { top: 190, height: 56, time: '14:00', title: msg`Styling`, client: 'Meerim' },
    ],
  },
  {
    master: 'Nurai',
    tint: 'var(--system-purple)',
    blocks: [{ top: 80, height: 100, time: '11:00', title: msg`Manicure`, client: 'Sabina' }],
  },
]

const DEMO_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '13:30', '14:00', '14:30', '15:00']

const STEPS = [
  {
    title: msg({ message: 'Sign in with your number', context: 'step instruction' }),
    text: msg`The code comes by Telegram or SMS. No passwords.`,
  },
  {
    title: msg`Create your page`,
    text: msg`Your business name and type: we’ll fill in typical services and prices.`,
  },
  {
    title: msg`Add specialists`,
    text: msg`Set the schedule and share your link on Instagram and 2GIS.`,
  },
]

const FAQ = [
  {
    question: msg`How much does it cost?`,
    answer: msg`The page, booking and schedule are free. SMS reminders to clients are included too.`,
  },
  {
    question: msg`Do I need a website or an app?`,
    answer: msg`No. You get a page at awaisa.kg/your-name, which you can add to Instagram, WhatsApp and 2GIS.`,
  },
  {
    question: msg`What if a client calls or walks in?`,
    answer: msg`Tap a free time in the schedule: the booking appears at once and the client gets a confirmation SMS.`,
  },
  {
    question: msg`We have several branches.`,
    answer: msg`Add branches with addresses and map pins, assign specialists, and clients pick the nearest.`,
  },
  {
    question: msg`Can I work together with an administrator?`,
    answer: msg`Yes: the owner and staff sign in to one dashboard with their own phone numbers.`,
  },
]

export { DEMO_BOOKING, DEMO_SCHEDULE, DEMO_SLOTS, FAQ, STATS, STEPS }
