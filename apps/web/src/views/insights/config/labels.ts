import type { BookingChannel, FunnelFlow, FunnelSegment, FunnelStep } from '@/shared/api/types'

// Words for the codes the funnel telemetry stores (apps/api/src/telemetry/telemetry.schemas.ts).

const FLOW_LABELS: Record<Exclude<FunnelFlow, 'signals'>, string> = {
  booking: 'Запись',
  search: 'Поиск',
  login: 'Вход',
  manage_booking: 'Талон и отмена',
  prepayment: 'Предоплата',
  waitlist: 'Лист ожидания',
  review: 'Отзыв',
  owner: 'Владельцы',
}

const STEP_LABELS: Record<FunnelStep, string> = {
  catalog: 'Открыли каталог',
  business: 'Открыли место',
  booking_open: 'Открыли запись',
  service: 'Выбрали услугу',
  specialist: 'Выбрали мастера',
  time: 'Выбрали время',
  contacts: 'Ввели контакты',
  booked: 'Записались',
  search_open: 'Открыли поиск',
  search_typed: 'Начали печатать',
  search_results: 'Увидели результаты',
  search_pick: 'Открыли найденное',
  login_open: 'Открыли вход',
  otp_sent: 'Получили код',
  otp_ok: 'Подтвердили номер',
  login_done: 'Вошли',
  ticket_open: 'Открыли талон',
  reschedule_open: 'Начали перенос',
  reschedule_done: 'Перенесли',
  cancel: 'Отменили',
  cancel_undone: 'Вернули отменённую',
  deposit_shown: 'Увидели условия предоплаты',
  checkout_open: 'Открыли оплату',
  pay_click: 'Нажали «Оплатить»',
  paid: 'Оплатили',
  full_day_shown: 'Попали на занятый день',
  waitlist_open: 'Открыли лист ожидания',
  waitlist_joined: 'Встали в очередь',
  review_open: 'Открыли отзыв',
  review_rated: 'Поставили оценку',
  review_sent: 'Отправили отзыв',
  business_landing: 'Открыли «Для бизнеса»',
  register_name: 'Шаг 1: название',
  register_kind: 'Шаг 2: вид бизнеса',
  register_contacts: 'Шаг 3: контакты',
  register_done: 'Создали страницу',
  form_error: 'Ошибка в поле',
  toast_action: 'Нажали в уведомлении',
  search_empty: 'Поиск без результатов',
  otp_error: 'Неверный код',
  pay_failed: 'Оплата не прошла',
}

// `meta` codes: which field, which toast action, which channel.
const VALUE_LABELS: Record<string, string> = {
  phone: 'Телефон',
  name: 'Имя',
  rating: 'Оценка в отзыве',
  waitlist_name: 'Имя в листе ожидания',
  waitlist_phone: 'Телефон в листе ожидания',
  business_name: 'Название бизнеса',
  business_slug: 'Адрес страницы бизнеса',
  undo_cancel: '«Вернуть» отменённую запись',
  staff_undo_cancel: 'Кабинет: «Вернуть» отмену',
  staff_undo_move: 'Кабинет: «Вернуть» перенос',
  staff_undo_close_day: 'Кабинет: «Вернуть» «Все пришли»',
  sms: 'SMS',
  telegram: 'Telegram',
}

type SegmentKey = keyof FunnelSegment

const SEGMENT_LABELS: Record<SegmentKey, { title: string; values: Record<string, string> }> = {
  type: {
    title: 'Устройство',
    values: { phone: 'Телефон', tablet: 'Планшет', desktop: 'Компьютер' },
  },
  textScale: {
    title: 'Шрифт в браузере',
    values: { normal: 'Обычный', large: 'Крупный', huge: 'Очень крупный' },
  },
  net: {
    title: 'Сеть',
    values: { slow: 'Медленная', fast: 'Быстрая', unknown: 'Не знаем' },
  },
  os: {
    title: 'Система',
    values: { ios: 'iOS', android: 'Android', other: 'Другая' },
  },
  app: {
    title: 'Откуда',
    values: { web: 'Сайт', native: 'Приложение' },
  },
}

// The cuts offered over the funnel: the ones that say most about the personas.
const FILTER_KEYS: SegmentKey[] = ['type', 'textScale', 'net']

export type { SegmentKey }
const CHANNEL_LABELS: Record<BookingChannel, string> = {
  catalog: 'Каталог',
  for_you: '«Для вас»',
  feed: '«Образы»',
  search: 'Поиск',
  map: 'Карта',
  salon_link: 'Ссылка салона',
  other: 'Другое',
}

export { CHANNEL_LABELS, FILTER_KEYS, FLOW_LABELS, SEGMENT_LABELS, STEP_LABELS, VALUE_LABELS }
