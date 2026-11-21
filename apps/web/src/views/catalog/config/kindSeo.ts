import type { BusinessKind } from '@/shared/api/types'

type KindSeo = { title: string; description: string }

// What people type into a search engine for each kind. «Другое» has no landing of its own: it
// mixes whatever does not fit the rest, so it stays out of the index.
const KIND_SEO: Partial<Record<BusinessKind, KindSeo>> = {
  beauty: {
    title: 'Салоны красоты Бишкека: цены и онлайн-запись',
    description:
      'Стрижки, окрашивание, укладки и макияж в салонах Бишкека: цены, мастера с отзывами и свободное время. Запись онлайн без звонков.',
  },
  barber: {
    title: 'Барбершопы Бишкека: цены и онлайн-запись',
    description:
      'Мужские стрижки, борода и бритьё в барбершопах Бишкека: цены, барберы с отзывами и свободное время. Запись онлайн без звонков.',
  },
  nails: {
    title: 'Маникюр и педикюр в Бишкеке: цены и онлайн-запись',
    description:
      'Ногтевые студии Бишкека: маникюр, педикюр и наращивание, цены, мастера с отзывами и свободное время. Запись онлайн без звонков.',
  },
  spa: {
    title: 'SPA и массаж в Бишкеке: цены и онлайн-запись',
    description:
      'Массаж, SPA и уход за телом в Бишкеке: цены, мастера с отзывами и свободное время. Запись онлайн без звонков.',
  },
  health: {
    title: 'Стоматология и остеопатия в Бишкеке: онлайн-запись',
    description:
      'Стоматологии, остеопаты и специалисты по здоровью в Бишкеке: цены, отзывы и свободное время. Запись онлайн без звонков.',
  },
}

const INDEXED_KINDS = Object.keys(KIND_SEO) as BusinessKind[]

export { INDEXED_KINDS, KIND_SEO }
