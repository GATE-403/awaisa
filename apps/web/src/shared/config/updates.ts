import fromPullRequests from './updates.json'

// «Что нового» (`/updates`): the newest first. Add an entry when a change is felt by people -
// not for refactors or CI. Usually through the PR: its «## Что нового» section is copied into
// `updates.json` when it merges (`.github/workflows/updates.yml`). `id` must be new each time: it
// marks the entry as read.
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

const WRITTEN_BY_HAND: UpdateEntry[] = [
  {
    id: '2026-11-19-hold-to-delete',
    date: '2026-11-19',
    audience: 'business',
    title: 'Отмена и удаление - удержанием',
    text: 'Чтобы отменить запись или удалить фото, акцию, филиал, позицию склада или абонемент, удерживайте красную кнопку секунду. Случайное нажатие больше ничего не удалит.',
  },
  {
    id: '2026-11-19-booking-ticket',
    date: '2026-11-19',
    audience: 'business',
    title: 'Запись в кабинете - как талон',
    text: 'Откройте запись в расписании: день, время, услуга, клиент со звонком и WhatsApp и сумма к оплате - на одном талоне, как у клиента.',
  },
  {
    id: '2026-11-19-cabinet-head',
    date: '2026-11-19',
    audience: 'business',
    title: 'Кабинет стал компактнее',
    text: 'Название, разделы и кнопки теперь в одной строке наверху - расписание видно сразу, без прокрутки.',
  },
  {
    id: '2026-11-18-sign-in',
    date: '2026-11-18',
    audience: 'everyone',
    title: 'Новый вход',
    text: 'Вход по номеру или через Telegram на одном экране, а после входа вас встречает приветствие по имени.',
    link: { href: '/login', label: 'Войти' },
  },
  {
    id: '2026-11-18-schedule-cards',
    date: '2026-11-18',
    audience: 'business',
    title: 'Расписание читается с одного взгляда',
    text: 'Каждая запись - карточка с клиентом, услугой и состоянием: «Ждём», «Сейчас», «Отметить». «Перерыв» закрывает время, а «Все пришли» отмечает прошедшие визиты одним нажатием.',
  },
  {
    id: '2026-11-18-analytics-charts',
    date: '2026-11-18',
    audience: 'business',
    title: 'Аналитика с графиками',
    text: 'Выручка по дням рядом с тем же периодом в прошлом, доли оплат и загрузка мастеров - с подсказкой по каждому дню.',
  },
  {
    id: '2026-11-18-page-tab',
    date: '2026-11-18',
    audience: 'business',
    title: 'Страница бизнеса правится на месте',
    text: 'Во вкладке «Страница» меняйте обложку, логотип, название и описание прямо там, где их видят клиенты.',
  },
  {
    id: '2026-11-18-client-card',
    date: '2026-11-18',
    audience: 'business',
    title: 'Карточка клиента',
    text: 'Визиты, траты, обычная услуга и мастер, следующий визит и день рождения - коротко, без пустых строк. Оттуда же можно записать клиента снова.',
  },
  {
    id: '2026-11-18-price-on-ticket',
    date: '2026-11-18',
    audience: 'clients',
    title: 'Сумма к оплате - крупно',
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
    title: '«Образы» - колодой',
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

// Newest day first; within a day the merged PRs' entries lead, in the order they were written.
const UPDATES: UpdateEntry[] = [...(fromPullRequests as UpdateEntry[]), ...WRITTEN_BY_HAND].sort(
  (a, b) => b.date.localeCompare(a.date),
)

const LATEST_UPDATE_ID = UPDATES[0]?.id ?? ''

export type { UpdateAudience, UpdateEntry }
export { LATEST_UPDATE_ID, UPDATES }
