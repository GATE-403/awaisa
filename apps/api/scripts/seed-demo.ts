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

const main = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  const slugs = BUSINESSES.map((business) => business.slug)
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
    for (const seedBusiness of BUSINESSES) {
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

await main()
