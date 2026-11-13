// Demo data for development: businesses across Bishkek with services, masters, two months of
// visits (paid, no-shows, cancellations), upcoming bookings and reviews.
// Re-runnable: removes the demo businesses it created before and inserts them again.
// Run: pnpm --filter api seed:demo (reads DATABASE_URL from the root .env).
import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const ROOT_ENV = join(import.meta.dirname, '../../../.env')
if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

const OFFSET_MS = 6 * 60 * 60_000
const DAYS_BACK = 60
const DAYS_AHEAD = 7

// Deterministic randomness: the same demo every run.
let seed = 20261111
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)] as T
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))

type ServiceSeed = [name: string, minutes: number, price: number, description: string]
type CategorySeed = { name: string; services: ServiceSeed[] }
type BusinessSeed = {
  slug: string
  name: string
  kind: 'beauty' | 'barber' | 'nails' | 'spa' | 'health' | 'other'
  description: string
  branches: { name: string; address: string; lat: number; lng: number }[]
  masters: [name: string, role: string][]
  categories: CategorySeed[]
  hours: [opens: number, closes: number]
  daysOff?: number[]
}

const BARBER: CategorySeed[] = [
  {
    name: 'Стрижки',
    services: [
      ['Мужская стрижка', 45, 900, 'Машинка и ножницы, мытьё, укладка'],
      ['Стрижка + борода', 75, 1400, 'Стрижка и оформление бороды'],
      ['Детская стрижка', 30, 600, 'До 12 лет'],
      ['Стрижка машинкой', 30, 500, 'Одна насадка'],
    ],
  },
  {
    name: 'Борода',
    services: [
      ['Оформление бороды', 30, 600, 'Контур, длина, масло'],
      ['Королевское бритьё', 45, 900, 'Горячее полотенце, опасная бритва'],
    ],
  },
]

const BEAUTY: CategorySeed[] = [
  {
    name: 'Волосы',
    services: [
      ['Женская стрижка', 60, 1500, 'Консультация, мытьё, стрижка и укладка'],
      ['Укладка', 40, 1000, 'Брашинг или локоны'],
      ['Вечерняя причёска', 90, 2800, 'Собранная или локоны на событие'],
    ],
  },
  {
    name: 'Окрашивание',
    services: [
      ['Окрашивание корней', 90, 2500, 'До 3 см, профессиональные красители'],
      ['Airtouch', 240, 9000, 'Мягкое осветление с переходом'],
      ['Тонирование', 60, 2000, 'Освежить цвет и блеск'],
    ],
  },
  {
    name: 'Уход',
    services: [['Кератиновое восстановление', 120, 4500, 'Глубокое восстановление и блеск']],
  },
]

const NAILS: CategorySeed[] = [
  {
    name: 'Руки',
    services: [
      ['Маникюр с покрытием', 90, 1800, 'Аппаратный маникюр и гель-лак'],
      ['Маникюр без покрытия', 45, 900, 'Гигиенический'],
      ['Наращивание', 150, 3200, 'Гель, любая длина'],
    ],
  },
  {
    name: 'Ноги',
    services: [
      ['Педикюр с покрытием', 90, 2200, 'Аппаратный педикюр и гель-лак'],
      ['Педикюр без покрытия', 60, 1500, 'Гигиенический'],
    ],
  },
]

const SPA: CategorySeed[] = [
  {
    name: 'Массаж',
    services: [
      ['Классический массаж', 60, 2500, 'Всё тело'],
      ['Массаж спины', 30, 1300, 'Шея, плечи, спина'],
      ['Антицеллюлитный', 60, 2800, 'Курс от 10 сеансов'],
      ['Стоун-терапия', 90, 3500, 'Горячие камни'],
    ],
  },
  {
    name: 'Уход за лицом',
    services: [
      ['Чистка лица', 75, 2600, 'Комбинированная'],
      ['Уходовая процедура', 60, 2200, 'Увлажнение и маска'],
    ],
  },
]

const HEALTH: CategorySeed[] = [
  {
    name: 'Приём',
    services: [
      ['Консультация', 30, 1500, 'Осмотр и план лечения'],
      ['Повторный приём', 30, 1000, 'В течение месяца'],
    ],
  },
  {
    name: 'Процедуры',
    services: [
      ['Кинезиотейпирование', 30, 1200, 'Одна зона'],
      ['Лечебный массаж', 45, 2000, 'По назначению'],
      ['ЛФК занятие', 60, 1800, 'Индивидуально с инструктором'],
    ],
  },
]

const BROWS: CategorySeed[] = [
  {
    name: 'Брови',
    services: [
      ['Коррекция бровей', 30, 700, 'Воск или пинцет'],
      ['Окрашивание бровей', 30, 800, 'Краска или хна'],
      ['Ламинирование бровей', 60, 1800, 'С окрашиванием'],
    ],
  },
  {
    name: 'Ресницы',
    services: [
      ['Ламинирование ресниц', 60, 2000, 'Изгиб и уход'],
      ['Наращивание 2D', 150, 2800, 'Объём'],
    ],
  },
]

const TATTOO: CategorySeed[] = [
  {
    name: 'Тату',
    services: [
      ['Мини-тату', 60, 3000, 'До 5 см'],
      ['Тату средняя', 180, 9000, 'До 15 см, эскиз включён'],
      ['Консультация и эскиз', 30, 0, 'Обсудим идею'],
    ],
  },
  { name: 'Пирсинг', services: [['Прокол уха', 20, 1200, 'С украшением']] },
]

const COSMETOLOGY: CategorySeed[] = [
  {
    name: 'Уход за лицом',
    services: [
      ['Чистка лица', 60, 2500, 'Комбинированная, с маской'],
      ['Пилинг', 45, 2000, 'Миндальный или молочный'],
      ['Массаж лица', 40, 1500, 'Скульптурный, с маслом'],
    ],
  },
  {
    name: 'Аппаратная косметология',
    services: [
      ['RF-лифтинг', 50, 3500, 'Подтяжка овала, без восстановления'],
      ['Микротоки', 40, 2200, 'Тонус и отёки'],
    ],
  },
]

const MAKEUP: CategorySeed[] = [
  {
    name: 'Макияж',
    services: [
      ['Дневной макияж', 60, 1800, 'Лёгкий, на весь день'],
      ['Вечерний макияж', 75, 2500, 'Стрелки, акцент на глаза или губы'],
      ['Свадебный образ', 120, 6000, 'Макияж и причёска, пробный выезд'],
    ],
  },
  {
    name: 'Укладки',
    services: [
      ['Локоны', 45, 1500, 'Плойка или утюжок'],
      ['Собранная причёска', 60, 2500, 'Пучок, коса, ракушка'],
    ],
  },
]

const SUGARING: CategorySeed[] = [
  {
    name: 'Депиляция',
    services: [
      ['Шугаринг ног полностью', 60, 1800, 'Мягкая паста, уход после'],
      ['Шугаринг подмышек', 20, 600, 'Быстро и бережно'],
      ['Глубокое бикини', 40, 1500, 'Одноразовые материалы'],
    ],
  },
  {
    name: 'Лазер',
    services: [
      ['Лазерная эпиляция подмышек', 20, 1500, 'Диодный лазер'],
      ['Лазерная эпиляция голеней', 40, 3500, 'Курс от 6 процедур'],
    ],
  },
]

const DENTAL: CategorySeed[] = [
  {
    name: 'Стоматология',
    services: [
      ['Консультация стоматолога', 30, 500, 'Осмотр и план лечения'],
      ['Профгигиена', 60, 3500, 'Ультразвук, Air Flow, полировка'],
      ['Отбеливание', 90, 9000, 'Кабинетное, за один визит'],
      ['Лечение кариеса', 60, 4000, 'Светоотверждаемая пломба'],
    ],
  },
]

const BUSINESSES: BusinessSeed[] = [
  {
    slug: 'kings-barbershop',
    name: 'Kings Barbershop',
    kind: 'barber',
    description: 'Барбершоп в центре: стрижки, бороды и горячее бритьё.',
    branches: [{ name: 'Центр', address: 'пр. Чуй, 120', lat: 42.8762, lng: 74.6075 }],
    masters: [
      ['Нурсултан Абдыкадыров', 'Топ-барбер'],
      ['Эрлан Сыдыков', 'Барбер'],
      ['Тимур Асанов', 'Барбер'],
    ],
    categories: BARBER,
    hours: [10 * 60, 21 * 60],
  },
  {
    slug: 'boroda-barber',
    name: 'Борода',
    kind: 'barber',
    description: 'Мужской клуб: стрижки, бороды, кофе.',
    branches: [
      { name: 'Джал', address: 'мкр. Джал, 23', lat: 42.8336, lng: 74.5782 },
      { name: 'Восток-5', address: 'мкр. Восток-5, 14', lat: 42.8618, lng: 74.6567 },
    ],
    masters: [
      ['Азамат Токтогулов', 'Барбер'],
      ['Данияр Жумабеков', 'Барбер'],
      ['Руслан Ким', 'Старший барбер'],
      ['Бакыт Осмонов', 'Барбер'],
    ],
    categories: BARBER,
    hours: [9 * 60, 21 * 60],
  },
  {
    slug: 'aisuluu-beauty',
    name: 'Айсулуу Beauty',
    kind: 'beauty',
    description: 'Стрижки, сложное окрашивание и уход за волосами.',
    branches: [{ name: 'Основной', address: 'ул. Киевская, 95', lat: 42.8749, lng: 74.5933 }],
    masters: [
      ['Айсулуу Мамытова', 'Топ-стилист'],
      ['Жибек Касымова', 'Колорист'],
      ['Алина Ли', 'Стилист'],
    ],
    categories: BEAUTY,
    hours: [10 * 60, 20 * 60],
    daysOff: [6],
  },
  {
    slug: 'lumiere-salon',
    name: 'Lumière',
    kind: 'beauty',
    description: 'Салон красоты полного цикла: волосы, уход, вечерние образы.',
    branches: [
      { name: 'Асанбай', address: 'мкр. Асанбай, 7', lat: 42.8204, lng: 74.6203 },
      { name: 'Ала-Арча', address: 'ТЦ Ала-Арча, 2 этаж', lat: 42.8475, lng: 74.6012 },
    ],
    masters: [
      ['Мээрим Сатыбалдиева', 'Топ-стилист'],
      ['Нургуль Бекова', 'Колорист'],
      ['Елена Пак', 'Стилист'],
      ['Асель Иманалиева', 'Стилист'],
    ],
    categories: BEAUTY,
    hours: [9 * 60, 21 * 60],
  },
  {
    slug: 'nail-room',
    name: 'Nail Room',
    kind: 'nails',
    description: 'Маникюр и педикюр, стерильные инструменты, 300+ оттенков.',
    branches: [{ name: 'Основной', address: 'ул. Токтогула, 200', lat: 42.8702, lng: 74.5868 }],
    masters: [
      ['Камила Усенова', 'Мастер маникюра'],
      ['Айгерим Темирова', 'Мастер маникюра'],
      ['Диана Огай', 'Мастер педикюра'],
    ],
    categories: NAILS,
    hours: [9 * 60, 20 * 60],
  },
  {
    slug: 'manikyur-7',
    name: 'Маникюрная 7',
    kind: 'nails',
    description: 'Быстрый и аккуратный маникюр рядом с домом.',
    branches: [{ name: 'Основной', address: '7 мкр., 41', lat: 42.8432, lng: 74.6239 }],
    masters: [
      ['Гульнара Абдиева', 'Мастер'],
      ['Чолпон Мырзаева', 'Мастер'],
    ],
    categories: NAILS,
    hours: [10 * 60, 19 * 60],
    daysOff: [0],
  },
  {
    slug: 'ala-too-spa',
    name: 'Ала-Тоо SPA',
    kind: 'spa',
    description: 'Массаж и уходы для лица в тишине у гор.',
    branches: [{ name: 'Основной', address: 'ул. Ахунбаева, 98', lat: 42.8409, lng: 74.6112 }],
    masters: [
      ['Айдана Курманова', 'Массажист'],
      ['Сергей Ли', 'Массажист'],
      ['Нуриза Эсенова', 'Косметолог'],
    ],
    categories: SPA,
    hours: [10 * 60, 22 * 60],
  },
  {
    slug: 'teplo-massage',
    name: 'Тепло',
    kind: 'spa',
    description: 'Массажный кабинет: спина, шея, восстановление.',
    branches: [{ name: 'Основной', address: 'ул. Исанова, 42', lat: 42.8791, lng: 74.5986 }],
    masters: [
      ['Максат Жолдошев', 'Массажист'],
      ['Ольга Тен', 'Массажист'],
    ],
    categories: SPA,
    hours: [11 * 60, 21 * 60],
  },
  {
    slug: 'kinezio-centr',
    name: 'Кинезио центр',
    kind: 'health',
    description: 'Реабилитация, тейпирование и лечебный массаж.',
    branches: [{ name: 'Основной', address: 'ул. Боконбаева, 115', lat: 42.8728, lng: 74.6002 }],
    masters: [
      ['Бекболот Алиев', 'Реабилитолог'],
      ['Айпери Насирова', 'Инструктор ЛФК'],
    ],
    categories: HEALTH,
    hours: [9 * 60, 18 * 60],
    daysOff: [5, 6],
  },
  {
    slug: 'brow-bar',
    name: 'Brow Bar',
    kind: 'beauty',
    description: 'Брови и ресницы за полчаса.',
    branches: [{ name: 'Основной', address: 'ТЦ Бишкек Парк, 1 этаж', lat: 42.8754, lng: 74.5899 }],
    masters: [
      ['Аружан Сапарова', 'Бровист'],
      ['Мадина Ахмедова', 'Лэшмейкер'],
    ],
    categories: BROWS,
    hours: [10 * 60, 21 * 60],
  },
  {
    slug: 'ink-studio',
    name: 'Ink Studio',
    kind: 'other',
    description: 'Тату и пирсинг, индивидуальные эскизы.',
    branches: [{ name: 'Основной', address: 'ул. Логвиненко, 33', lat: 42.8785, lng: 74.6041 }],
    masters: [
      ['Артур Ким', 'Тату-мастер'],
      ['Айжан Токтосунова', 'Пирсер'],
    ],
    categories: TATTOO,
    hours: [12 * 60, 21 * 60],
    daysOff: [0],
  },
  {
    slug: 'barber-ok',
    name: 'Barber OK',
    kind: 'barber',
    description: 'Недорогие мужские стрижки без записи и по записи.',
    branches: [
      {
        name: 'Основной',
        address: 'Ошский рынок, ул. Бейшеналиевой, 3',
        lat: 42.8737,
        lng: 74.5677,
      },
    ],
    masters: [
      ['Улан Бекмуратов', 'Барбер'],
      ['Мирлан Акматов', 'Барбер'],
    ],
    categories: BARBER,
    hours: [9 * 60, 20 * 60],
  },
  // More places across the city: every kind has a few to compare, at different prices.
  {
    slug: 'gentlemen-club',
    name: 'Gentlemen Club',
    kind: 'barber',
    description: 'Барбершоп с виски-баром: стрижки, бороды, камуфляж седины.',
    branches: [{ name: 'Южная', address: 'Южная магистраль, 88', lat: 42.8378, lng: 74.6142 }],
    masters: [
      ['Арсен Маматов', 'Топ-барбер'],
      ['Эмир Касымбеков', 'Барбер'],
      ['Ислам Турсунов', 'Барбер'],
    ],
    categories: BARBER,
    hours: [11 * 60, 22 * 60],
  },
  {
    slug: 'fade-house',
    name: 'Fade House',
    kind: 'barber',
    description: 'Фейды, кроп и текстура — молодые барберы у Филармонии.',
    branches: [
      { name: 'Филармония', address: 'ул. Абдрахманова, 170', lat: 42.8782, lng: 74.5951 },
    ],
    masters: [
      ['Дастан Абдылдаев', 'Барбер'],
      ['Нурбек Сапаров', 'Барбер'],
    ],
    categories: BARBER,
    hours: [10 * 60, 21 * 60],
  },
  {
    slug: 'old-school',
    name: 'Old School',
    kind: 'barber',
    description: 'Классика: стрижка, опасная бритва, горячее полотенце.',
    branches: [
      { name: 'Аламедин-1', address: 'мкр. Аламедин-1, 52', lat: 42.8891, lng: 74.6421 },
      { name: 'Ортосай', address: 'ул. Ахунбаева, 190', lat: 42.8327, lng: 74.6125 },
    ],
    masters: [
      ['Бекболот Жээнбеков', 'Старший барбер'],
      ['Таалай Исаков', 'Барбер'],
      ['Канат Мамбетов', 'Барбер'],
      ['Алмаз Султанов', 'Барбер'],
    ],
    categories: BARBER,
    hours: [9 * 60, 20 * 60],
  },
  {
    slug: 'silk-studio',
    name: 'Silk Studio',
    kind: 'beauty',
    description: 'Стрижки, airtouch и кератин. Белинка, второй этаж.',
    branches: [{ name: 'Белинка', address: 'ул. Белинского, 40', lat: 42.8655, lng: 74.6191 }],
    masters: [
      ['Камила Рахимова', 'Колорист'],
      ['Диана Ким', 'Стилист'],
      ['Айдана Осмонова', 'Стилист'],
    ],
    categories: BEAUTY,
    hours: [10 * 60, 20 * 60],
    daysOff: [0],
  },
  {
    slug: 'nur-beauty',
    name: 'Нур Beauty',
    kind: 'beauty',
    description: 'Салон у дома: стрижки, окрашивание, уход по доступным ценам.',
    branches: [{ name: 'Кок-Жар', address: 'мкр. Кок-Жар, 18', lat: 42.8253, lng: 74.6338 }],
    masters: [
      ['Чынара Абдиева', 'Стилист'],
      ['Нурай Жолдошева', 'Стилист'],
    ],
    categories: BEAUTY,
    hours: [9 * 60, 19 * 60],
  },
  {
    slug: 'makeup-lab',
    name: 'Make-up Lab',
    kind: 'beauty',
    description: 'Макияж и укладки к празднику, свадебные образы.',
    branches: [{ name: 'Центр', address: 'ул. Исанова, 79', lat: 42.8767, lng: 74.6029 }],
    masters: [
      ['Сабина Алиева', 'Визажист'],
      ['Айпери Токтосунова', 'Визажист-стилист'],
    ],
    categories: MAKEUP,
    hours: [8 * 60, 20 * 60],
  },
  {
    slug: 'skin-lab',
    name: 'Skin Lab',
    kind: 'beauty',
    description: 'Косметология: чистки, пилинги, аппаратный уход.',
    branches: [{ name: 'Основной', address: 'пр. Манаса, 57', lat: 42.8641, lng: 74.5874 }],
    masters: [
      ['Бегимай Усенова', 'Косметолог'],
      ['Елена Сон', 'Врач-косметолог'],
    ],
    categories: COSMETOLOGY,
    hours: [10 * 60, 19 * 60],
    daysOff: [6],
  },
  {
    slug: 'sugar-room',
    name: 'Sugar Room',
    kind: 'beauty',
    description: 'Шугаринг и лазерная эпиляция, одноразовые материалы.',
    branches: [{ name: 'Тунгуч', address: 'мкр. Тунгуч, 61', lat: 42.8536, lng: 74.6452 }],
    masters: [
      ['Аружан Бекова', 'Мастер депиляции'],
      ['Айгерим Сатарова', 'Мастер депиляции'],
    ],
    categories: SUGARING,
    hours: [9 * 60, 21 * 60],
  },
  {
    slug: 'pink-nails',
    name: 'Pink Nails',
    kind: 'nails',
    description: 'Маникюр с дизайном, наращивание, педикюр.',
    branches: [{ name: 'Основной', address: 'ул. Ахунбаева, 119', lat: 42.8443, lng: 74.6061 }],
    masters: [
      ['Мадина Эркинова', 'Нейл-мастер'],
      ['Алия Жусупова', 'Нейл-мастер'],
      ['Регина Ли', 'Топ-мастер'],
    ],
    categories: NAILS,
    hours: [10 * 60, 21 * 60],
  },
  {
    slug: 'nails-coffee',
    name: 'Nails & Coffee',
    kind: 'nails',
    description: 'Маникюр и кофе в одном месте — в ТЦ Вефа.',
    branches: [{ name: 'Вефа', address: 'ТЦ Вефа, 3 этаж', lat: 42.8572, lng: 74.6093 }],
    masters: [
      ['Кристина Пак', 'Нейл-мастер'],
      ['Зарина Абдыкалыкова', 'Нейл-мастер'],
    ],
    categories: NAILS,
    hours: [10 * 60, 22 * 60],
  },
  {
    slug: 'tengri-spa',
    name: 'Тенгри SPA',
    kind: 'spa',
    description: 'Хаммам, массажи и SPA-программы для двоих.',
    branches: [{ name: 'Кок-Жар', address: 'ул. Аалы Токомбаева, 21', lat: 42.8198, lng: 74.6262 }],
    masters: [
      ['Самат Орозбеков', 'Массажист'],
      ['Гульнара Иманова', 'SPA-мастер'],
      ['Жанара Асанова', 'Массажист'],
    ],
    categories: SPA,
    hours: [10 * 60, 23 * 60],
  },
  {
    slug: 'thai-massage',
    name: 'Тай Массаж',
    kind: 'spa',
    description: 'Тайский и стоун-массаж, мастера с сертификатами Ват По.',
    branches: [{ name: 'Советская', address: 'ул. Абдрахманова, 114', lat: 42.8717, lng: 74.5956 }],
    masters: [
      ['Нок Сомчай', 'Мастер тайского массажа'],
      ['Айжан Токтогулова', 'Массажист'],
    ],
    categories: SPA,
    hours: [11 * 60, 22 * 60],
  },
  {
    slug: 'dent-smile',
    name: 'Dent Smile',
    kind: 'health',
    description: 'Стоматология: гигиена, лечение и отбеливание без очередей.',
    branches: [
      { name: 'Центр', address: 'ул. Киевская, 148', lat: 42.8741, lng: 74.6036 },
      { name: 'Джал', address: 'мкр. Джал-29, 4', lat: 42.8302, lng: 74.5739 },
    ],
    masters: [
      ['Эльмира Асанбекова', 'Стоматолог-терапевт'],
      ['Марат Иманкулов', 'Стоматолог'],
      ['Ольга Тен', 'Гигиенист'],
    ],
    categories: DENTAL,
    hours: [9 * 60, 19 * 60],
    daysOff: [6],
  },
  {
    slug: 'osteo-life',
    name: 'Остео Лайф',
    kind: 'health',
    description: 'Остеопатия, лечебный массаж и восстановление после травм.',
    branches: [{ name: 'Основной', address: 'ул. Боконбаева, 136', lat: 42.8698, lng: 74.6108 }],
    masters: [
      ['Тимур Байжигитов', 'Остеопат'],
      ['Наталья Ким', 'Реабилитолог'],
    ],
    categories: HEALTH,
    hours: [9 * 60, 18 * 60],
    daysOff: [5, 6],
  },
  {
    slug: 'lash-me',
    name: 'Lash Me',
    kind: 'beauty',
    description: 'Наращивание ресниц и брови — Восток-5.',
    branches: [{ name: 'Восток-5', address: 'мкр. Восток-5, 2/1', lat: 42.8601, lng: 74.6611 }],
    masters: [
      ['Айсулуу Темирова', 'Лэшмейкер'],
      ['Бермет Касымова', 'Бровист'],
    ],
    categories: BROWS,
    hours: [10 * 60, 20 * 60],
  },
  {
    slug: 'black-needle',
    name: 'Black Needle',
    kind: 'other',
    description: 'Тату-студия: графика, минимализм, перекрытия.',
    branches: [{ name: 'Основной', address: 'ул. Логвиненко, 55', lat: 42.8768, lng: 74.5894 }],
    masters: [
      ['Артём Ли', 'Тату-мастер'],
      ['Эрмек Сариев', 'Тату-мастер'],
    ],
    categories: TATTOO,
    hours: [12 * 60, 21 * 60],
    daysOff: [0],
  },
]

const FIRST_NAMES = [
  'Айбек',
  'Нурлан',
  'Эмир',
  'Бакыт',
  'Данияр',
  'Азамат',
  'Арсен',
  'Тимур',
  'Руслан',
  'Ислам',
  'Айгерим',
  'Асель',
  'Жибек',
  'Мээрим',
  'Нургуль',
  'Алина',
  'Камила',
  'Диана',
  'Айдана',
  'Елена',
  'Сабина',
  'Айпери',
  'Чынара',
  'Улан',
  'Мирлан',
  'Аружан',
  'Дастан',
  'Бегимай',
  'Нурай',
  'Артём',
]
const LAST_INITIALS = ['А', 'Б', 'К', 'М', 'Т', 'С', 'Ж', 'О', 'Н', 'Э']
const REVIEW_TEXTS: Record<number, string[]> = {
  5: [
    'Всё отлично, приду ещё!',
    'Лучший мастер, рекомендую.',
    'Быстро и аккуратно, спасибо.',
    'Очень уютно, приняли вовремя.',
    'Результат превзошёл ожидания.',
    '',
  ],
  4: [
    'Хорошо, но немного подождал.',
    'Понравилось, цена честная.',
    'Хорошо сделали, приду снова.',
    '',
  ],
  3: ['Нормально, но ожидал большего.', 'Средне, мастер торопился.'],
  2: ['Пришлось ждать 20 минут.'],
  1: ['Не понравилось, переделывали.'],
}
const REPLIES = [
  'Спасибо! Ждём вас снова 🙌',
  'Благодарим за отзыв, передадим мастеру.',
  'Спасибо, что выбрали нас!',
  'Извините за ожидание, исправимся.',
]

const pickRating = () => {
  const roll = random()
  return roll < 0.6 ? 5 : roll < 0.88 ? 4 : roll < 0.96 ? 3 : roll < 0.99 ? 2 : 1
}

const phoneFor = (index: number) => `+99670${String(1000000 + index * 7919).slice(-7)}`

const toUtc = (dateKey: string, minutes: number) =>
  new Date(Date.parse(`${dateKey}T00:00:00Z`) + minutes * 60_000 - OFFSET_MS)

const dayKey = (offset: number) =>
  new Date(Date.now() + OFFSET_MS + offset * 86_400_000).toISOString().slice(0, 10)

const weekdayOf = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7

const tokenHash = () => createHash('sha256').update(randomUUID()).digest('hex')

// Demo pictures from Unsplash (free to use, hotlinked as their guidelines ask): a cover and
// photos of finished work per kind, so the catalog cards and the «Работы» feed look real.
const UNSPLASH = (id: string, size: 'cover' | 'work') =>
  `https://images.unsplash.com/photo-${id}?${
    size === 'cover' ? 'w=1600&h=1000' : 'w=900&h=1600'
  }&fit=crop&auto=format&q=80`

const PICTURES: Record<string, { covers: string[]; works: string[] }> = {
  barber: {
    covers: ['1585747860715-2ba37e788b70', '1503951914875-452162b0f3f1'],
    works: [
      '1599351431202-1e0f0137899a',
      '1622286342621-4bd786c2447c',
      '1605497788044-5a32c7078486',
      '1503951914875-452162b0f3f1',
    ],
  },
  beauty: {
    covers: ['1560066984-138dadb4c035', '1633681926022-84c23e8cb2d6'],
    works: [
      '1522337360788-8b13dee7a37e',
      '1562322140-8baeececf3df',
      '1527799820374-dcf8d9d4a388',
      '1580618672591-eb180b1a973f',
      '1634449571010-02389ed0f9b0',
      '1595476108010-b4d1f102b1b1',
    ],
  },
  brows: {
    covers: ['1512496015851-a90fb38ba796'],
    works: ['1487412947147-5cebf100ffc2', '1516975080664-ed2fc6a32937'],
  },
  nails: {
    covers: ['1604654894610-df63bc536371'],
    works: [
      '1610992015732-2449b76344bc',
      '1632345031435-8727f6897d53',
      '1607779097040-26e80aa78e66',
      '1519014816548-bf5fe059798b',
    ],
  },
  spa: {
    covers: ['1540555700478-4be289fbecef', '1600334089648-b0d9d3028eb2'],
    works: [
      '1544161515-4ab6ce6db874',
      '1515377905703-c4788e51af15',
      '1596178060671-7a80dc8059ea',
      '1570172619644-dfd03ed5d881',
    ],
  },
  health: {
    covers: ['1519494026892-80bbd2d6fd0d'],
    works: ['1576091160550-2173dba999ef'],
  },
  other: {
    covers: ['1562962230-16e4623d36e6'],
    works: ['1611501275019-9b5cda994e8d', '1562962230-16e4623d36e6'],
  },
}

// Places whose pictures differ from their kind's (brows and make-up in «beauty», face care).
const PICTURE_SET: Record<string, string> = {
  'brow-bar': 'brows',
  'lash-me': 'brows',
  'makeup-lab': 'brows',
  'skin-lab': 'spa',
  'sugar-room': 'spa',
  'pink-nails': 'nails',
}

const picturesFor = (business: BusinessSeed) =>
  PICTURES[PICTURE_SET[business.slug] ?? business.kind]

// `--add`: only demo businesses that are not in the database yet; the ones already there (and
// any bookings made by hand) stay as they are.
const main = async (isAdding = false) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const { rows: present } = isAdding
    ? await client.query('SELECT "slug" FROM "businesses" WHERE "slug" = ANY($1)', [
        BUSINESSES.map((business) => business.slug),
      ])
    : { rows: [] as { slug: string }[] }
  const seeded = BUSINESSES.filter(
    (business) => !present.some((row: { slug: string }) => row.slug === business.slug),
  )
  const slugs = seeded.map((business) => business.slug)
  try {
    await client.query('BEGIN')
    // bookings → services is RESTRICT, so visits go before their businesses.
    await client.query(
      'DELETE FROM "bookings" WHERE "business_id" IN (SELECT "id" FROM "businesses" WHERE "slug" = ANY($1))',
      [slugs],
    )
    await client.query('DELETE FROM "businesses" WHERE "slug" = ANY($1)', [slugs])

    let clientCounter = 0
    const totals = { businesses: 0, bookings: 0, reviews: 0 }
    for (const seedBusiness of seeded) {
      const { rows } = await client.query(
        `INSERT INTO "businesses" ("slug", "name", "kind", "description", "address", "phone", "slot_minutes")
         VALUES ($1, $2, $3, $4, $5, $6, 30) RETURNING "id"`,
        [
          seedBusiness.slug,
          seedBusiness.name,
          seedBusiness.kind,
          seedBusiness.description,
          seedBusiness.branches[0]?.address ?? '',
          `+99655${between(1000000, 9999999)}`,
        ],
      )
      const businessId = rows[0].id as string
      totals.businesses += 1

      for (let weekday = 0; weekday < 7; weekday += 1) {
        if (seedBusiness.daysOff?.includes(weekday)) continue
        await client.query(
          'INSERT INTO "working_hours" ("business_id", "weekday", "opens_minutes", "closes_minutes") VALUES ($1, $2, $3, $4)',
          [businessId, weekday, seedBusiness.hours[0], seedBusiness.hours[1]],
        )
      }

      const branchIds: string[] = []
      for (const [position, branch] of seedBusiness.branches.entries()) {
        const { rows: branchRows } = await client.query(
          `INSERT INTO "branches" ("business_id", "name", "address", "latitude", "longitude", "position")
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"`,
          [businessId, branch.name, branch.address, branch.lat, branch.lng, position],
        )
        branchIds.push(branchRows[0].id as string)
      }

      const services: { id: string; minutes: number; price: number }[] = []
      for (const [categoryIndex, category] of seedBusiness.categories.entries()) {
        const categoryId = randomUUID()
        await client.query(
          'INSERT INTO "categories" ("id", "business_id", "name", "position") VALUES ($1, $2, $3, $4)',
          [categoryId, businessId, category.name, categoryIndex],
        )
        for (const [
          serviceIndex,
          [name, minutes, price, description],
        ] of category.services.entries()) {
          const id = randomUUID()
          await client.query(
            `INSERT INTO "services" ("id", "business_id", "category_id", "name", "description", "duration_minutes", "price", "is_popular", "position")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              businessId,
              categoryId,
              name,
              description,
              minutes,
              price,
              categoryIndex === 0 && serviceIndex < 2,
              services.length,
            ],
          )
          services.push({ id, minutes, price })
        }
      }

      const masters: { id: string; branchId: string | null }[] = []
      for (const [index, [name, role]] of seedBusiness.masters.entries()) {
        const id = randomUUID()
        const branchId = branchIds.length > 1 ? (branchIds[index % branchIds.length] ?? null) : null
        await client.query(
          `INSERT INTO "specialists" ("id", "business_id", "name", "role", "position", "branch_id", "commission_percent")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, businessId, name, role, index, branchId, pick([30, 35, 40, 45, 50])],
        )
        for (const service of services) {
          await client.query(
            'INSERT INTO "specialist_services" ("specialist_id", "service_id") VALUES ($1, $2)',
            [id, service.id],
          )
        }
        masters.push({ id, branchId })
      }

      // A cover and tagged work photos, newest first in the feed.
      const pictures = picturesFor(seedBusiness)
      if (pictures) {
        const index = BUSINESSES.indexOf(seedBusiness)
        await client.query('UPDATE "businesses" SET "cover_url" = $2 WHERE "id" = $1', [
          businessId,
          UNSPLASH(pictures.covers[index % pictures.covers.length] ?? '', 'cover'),
        ])
        for (const [position, photo] of pictures.works.entries()) {
          const service = services[position % services.length]
          const master = masters[position % masters.length]
          await client.query(
            `INSERT INTO "work_photos" ("business_id", "url", "service_id", "specialist_id", "created_at")
             VALUES ($1, $2, $3, $4, now() - make_interval(hours => $5))`,
            [
              businessId,
              UNSPLASH(photo, 'work'),
              service?.id ?? null,
              master?.id ?? null,
              index * 7 + position,
            ],
          )
        }
      }

      // A client base that comes back: about a third of visits are regulars.
      const regulars = Array.from({ length: between(25, 45) }, () => {
        clientCounter += 1
        return {
          name: `${pick(FIRST_NAMES)} ${pick(LAST_INITIALS)}.`,
          phone: phoneFor(clientCounter),
        }
      })

      for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset += 1) {
        const key = dayKey(offset)
        if (seedBusiness.daysOff?.includes(weekdayOf(key))) continue
        const isPast = offset < 0
        for (const master of masters) {
          let cursor = seedBusiness.hours[0] + 30 * between(0, 3)
          const visits = isPast ? between(2, 6) : between(0, 3)
          for (let visit = 0; visit < visits; visit += 1) {
            const service = pick(services)
            if (cursor + service.minutes > seedBusiness.hours[1]) break
            const startsAt = toUtc(key, cursor)
            const endsAt = new Date(startsAt.getTime() + service.minutes * 60_000)
            const person =
              random() < 0.35
                ? pick(regulars)
                : (() => {
                    clientCounter += 1
                    return {
                      name: `${pick(FIRST_NAMES)} ${pick(LAST_INITIALS)}.`,
                      phone: phoneFor(clientCounter),
                    }
                  })()
            const roll = random()
            const status = roll < 0.09 ? 'cancelled' : 'confirmed'
            const outcome =
              !isPast || status === 'cancelled' ? null : roll < 0.13 ? 'no_show' : 'arrived'
            const discounted = outcome === 'arrived' && random() < 0.1
            const { rows: bookingRows } = await client.query(
              `INSERT INTO "bookings" ("service_id", "specialist_id", "business_id", "branch_id", "starts_at", "ends_at",
                 "customer_name", "customer_phone", "status", "cancel_token_hash", "created_at", "cancelled_at",
                 "outcome", "paid_amount", "payment_method", "outcome_at", "reminder_sent_at", "review_requested_at")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING "id"`,
              [
                service.id,
                master.id,
                businessId,
                master.branchId ?? branchIds[0],
                startsAt,
                endsAt,
                person.name,
                person.phone,
                status,
                tokenHash(),
                new Date(startsAt.getTime() - between(1, 96) * 3_600_000),
                status === 'cancelled' ? new Date(startsAt.getTime() - 3_600_000) : null,
                outcome,
                outcome === 'arrived'
                  ? discounted
                    ? Math.round(service.price * 0.9)
                    : service.price
                  : null,
                outcome === 'arrived' ? pick(['cash', 'cash', 'card', 'card', 'transfer']) : null,
                outcome ? endsAt : null,
                isPast ? startsAt : null,
                isPast ? endsAt : null,
              ],
            )
            totals.bookings += 1

            if (outcome === 'arrived' && random() < 0.35) {
              const rating = pickRating()
              await client.query(
                `INSERT INTO "reviews" ("business_id", "booking_id", "specialist_id", "service_id", "rating", "comment",
                   "author_name", "reply", "replied_at", "created_at")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                  businessId,
                  bookingRows[0].id,
                  master.id,
                  service.id,
                  rating,
                  pick(REVIEW_TEXTS[rating] ?? ['']),
                  person.name,
                  random() < 0.3 ? pick(REPLIES) : null,
                  null,
                  new Date(endsAt.getTime() + between(2, 30) * 3_600_000),
                ],
              )
              totals.reviews += 1
            }
            cursor += service.minutes + 30 * between(0, 2)
          }
        }
      }

      // Masters are rated by their real reviews, as the API does after each one.
      await client.query(
        `UPDATE "specialists" sp SET "rating" = r."avg"
         FROM (SELECT "specialist_id", round(avg("rating")::numeric, 1) AS "avg" FROM "reviews"
               WHERE "business_id" = $1 GROUP BY 1) r
         WHERE sp."id" = r."specialist_id"`,
        [businessId],
      )
    }

    await client.query('COMMIT')
    // biome-ignore lint/suspicious/noConsole: a CLI script reports what it did
    console.log(
      `Demo data: ${totals.businesses} businesses, ${totals.bookings} bookings, ${totals.reviews} reviews`,
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

// `--pictures`: only covers and work photos for the demo businesses already in the database —
// the rest of the data (and any bookings made by hand) stays as it is.
const addPictures = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    let photos = 0
    for (const [index, seedBusiness] of BUSINESSES.entries()) {
      const pictures = picturesFor(seedBusiness)
      const { rows } = await client.query('SELECT "id" FROM "businesses" WHERE "slug" = $1', [
        seedBusiness.slug,
      ])
      const businessId = rows[0]?.id as string | undefined
      if (!pictures || !businessId) continue
      await client.query('UPDATE "businesses" SET "cover_url" = $2 WHERE "id" = $1', [
        businessId,
        UNSPLASH(pictures.covers[index % pictures.covers.length] ?? '', 'cover'),
      ])
      await client.query(
        `DELETE FROM "work_photos" WHERE "business_id" = $1 AND "url" LIKE 'https://images.unsplash.com/%'`,
        [businessId],
      )
      const { rows: services } = await client.query(
        'SELECT "id" FROM "services" WHERE "business_id" = $1 AND "is_active" ORDER BY "position"',
        [businessId],
      )
      const { rows: masters } = await client.query(
        'SELECT "id" FROM "specialists" WHERE "business_id" = $1 AND "is_active" ORDER BY "position"',
        [businessId],
      )
      for (const [position, photo] of pictures.works.entries()) {
        await client.query(
          `INSERT INTO "work_photos" ("business_id", "url", "service_id", "specialist_id", "created_at")
           VALUES ($1, $2, $3, $4, now() - make_interval(hours => $5))`,
          [
            businessId,
            UNSPLASH(photo, 'work'),
            services[position % Math.max(services.length, 1)]?.id ?? null,
            masters[position % Math.max(masters.length, 1)]?.id ?? null,
            index * 7 + position,
          ],
        )
        photos += 1
      }
    }
    // biome-ignore lint/suspicious/noConsole: a CLI script reports what it did
    console.log(`Demo pictures: ${photos} work photos and covers`)
  } finally {
    await client.end()
  }
}

await (process.argv.includes('--pictures') ? addPictures() : main(process.argv.includes('--add')))
