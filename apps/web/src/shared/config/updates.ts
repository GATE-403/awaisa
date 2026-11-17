// «Что нового» (`/updates`): the newest first. Add an entry when a change is felt by people —
// not for refactors or CI. `id` must be new each time: it marks the entry as read.
type UpdateAudience = 'clients' | 'business' | 'everyone'

type UpdateEntry = {
  id: string
  /** Day key, YYYY-MM-DD. */
  date: string
  audience: UpdateAudience
  title: string
  text: string
  /** Where to try it. */
  link?: { href: string; label: string }
}

const UPDATES: UpdateEntry[] = [
  {
    id: '2026-11-18-price-on-ticket',
    date: '2026-11-18',
    audience: 'clients',
    title: 'Сумма к оплате — крупно',
    text: 'После записи цена видна сразу: на талоне и на экране «Вы записаны». Скидка и внесённая предоплата уже учтены.',
    link: { href: '/bookings', label: 'Мои записи' },
  },
  {
    id: '2026-11-18-tab-bar',
    date: '2026-11-18',
    audience: 'clients',
    title: 'Больше места на экране телефона',
    text: 'Нижнее меню уходит, пока листаете вниз, и возвращается, как только потянете вверх.',
  },
  {
    id: '2026-11-18-outage',
    date: '2026-11-18',
    audience: 'everyone',
    title: 'Страницы открываются даже при сбое',
    text: 'Если у нас что-то сломалось, страницы мест и каталог показываются из последней сохранённой версии, а не пустым экраном.',
  },
  {
    id: '2026-11-17-large-text',
    date: '2026-11-17',
    audience: 'everyone',
    title: 'Крупный шрифт и масштаб',
    text: 'С крупным системным шрифтом и при увеличении страницы до 200% ничего не обрезается: статус записи, адрес, «Сегодня» и «Завтра» видны целиком.',
  },
  {
    id: '2026-11-17-looks',
    date: '2026-11-17',
    audience: 'clients',
    title: '«Образы» — колодой',
    text: 'Листайте готовые работы мастеров свайпом и записывайтесь к тому, чья работа понравилась.',
    link: { href: '/feed', label: 'Открыть «Образы»' },
  },
  {
    id: '2026-11-16-telegram-login',
    date: '2026-11-16',
    audience: 'everyone',
    title: 'Вход через Telegram',
    text: 'Войти можно без SMS: подтвердите номер в нашем боте. Это тот же аккаунт, что и по SMS.',
    link: { href: '/login', label: 'Войти' },
  },
  {
    id: '2026-11-16-booking-stack',
    date: '2026-11-16',
    audience: 'clients',
    title: 'Запись по шагам',
    text: 'Выбранные услуга, мастер и время складываются в стопку карточек над следующим шагом. Нажмите на стопку, чтобы что-то поменять.',
  },
]

const LATEST_UPDATE_ID = UPDATES[0]?.id ?? ''

export type { UpdateAudience, UpdateEntry }
export { LATEST_UPDATE_ID, UPDATES }
