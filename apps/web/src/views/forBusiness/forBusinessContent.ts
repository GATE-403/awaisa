import type { Booking } from '@/shared/api/types'

// A sample client ticket for the showcase: the same component clients see after booking.
const DEMO_BOOKING: Booking = {
  id: '7a1c2e90-0000-4000-8000-000000000001',
  status: 'confirmed',
  serviceId: 'demo',
  serviceName: 'Мужская стрижка',
  price: 900,
  durationMinutes: 45,
  specialistId: 'demo',
  specialistName: 'Тимур',
  date: '2026-11-20',
  time: '14:30',
  startsAt: '2026-11-20T08:30:00.000Z',
  customerName: 'Данияр',
  business: {
    slug: 'demo',
    name: 'Barber Pro',
    address: 'ул. Токтогула, 125',
    phone: '',
    mapUrl: '',
  },
}

const STATS = [
  { value: '0 сом', label: 'в месяц. Без абонплаты и комиссии с записи.' },
  { value: '5 минут', label: 'до первой записи: название, услуги, мастера.' },
  { value: 'за 2 часа', label: 'клиенту приходит напоминание о визите.' },
  { value: '24/7', label: 'запись открыта, даже когда салон закрыт.' },
]

const DEMO_SCHEDULE = [
  {
    master: 'Тимур',
    tint: 'var(--system-blue)',
    blocks: [
      { top: 0, height: 72, time: '10:00', title: 'Стрижка', client: 'Азамат' },
      { top: 120, height: 96, time: '12:30', title: 'Стрижка и борода', client: 'Данияр' },
    ],
  },
  {
    master: 'Айгерим',
    tint: 'var(--system-pink)',
    blocks: [
      { top: 40, height: 120, time: '10:30', title: 'Окрашивание', client: 'Алина' },
      { top: 190, height: 56, time: '14:00', title: 'Укладка', client: 'Мээрим' },
    ],
  },
  {
    master: 'Нурай',
    tint: 'var(--system-purple)',
    blocks: [{ top: 80, height: 100, time: '11:00', title: 'Маникюр', client: 'Сабина' }],
  },
]

const DEMO_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '13:30', '14:00', '14:30', '15:00']

const STEPS = [
  { title: 'Войдите по номеру', text: 'Код придёт в Telegram или SMS. Пароли не нужны.' },
  {
    title: 'Создайте страницу',
    text: 'Название и вид бизнеса — мы подставим типичные услуги и цены.',
  },
  { title: 'Добавьте мастеров', text: 'Укажите график — и делитесь ссылкой в Instagram и 2ГИС.' },
]

const FAQ = [
  {
    question: 'Сколько это стоит?',
    answer: 'Страница, запись и расписание бесплатны. SMS-напоминания клиентам тоже включены.',
  },
  {
    question: 'Нужен ли сайт или приложение?',
    answer:
      'Нет. У вас будет страница awaisa.kg/ваше-название — её можно поставить в Instagram, WhatsApp и 2ГИС.',
  },
  {
    question: 'А если клиент звонит или приходит без записи?',
    answer:
      'Нажмите на свободное время в расписании — запись появится сразу, клиенту придёт SMS с подтверждением.',
  },
  {
    question: 'У нас несколько филиалов.',
    answer:
      'Добавьте филиалы с адресами и метками на карте, привяжите мастеров — клиент выберет ближайший.',
  },
  {
    question: 'Можно работать вместе с администратором?',
    answer: 'Да: владелец и сотрудники заходят в один кабинет по своим номерам телефона.',
  },
]

export { DEMO_BOOKING, DEMO_SCHEDULE, DEMO_SLOTS, FAQ, STATS, STEPS }
