type Company = {
  name: string
  tagline: string
  address: string
  mapUrl: string
  phone: string
  phoneHref: string
  whatsappHref: string
  hours: string
  rating: number
  reviewsCount: number
}

const COMPANY: Company = {
  name: 'Awaisa Studio',
  tagline: 'Стрижки, окрашивание и уход. Запись онлайн за минуту — без звонков.',
  address: 'Бишкек, ул. Токтогула, 125',
  mapUrl: 'https://2gis.kg/bishkek/search/Токтогула%20125',
  phone: '+996 555 123 456',
  phoneHref: 'tel:+996555123456',
  whatsappHref: 'https://wa.me/996555123456',
  hours: 'Ежедневно 10:00–20:00',
  rating: 4.9,
  reviewsCount: 312,
}

export type { Company }
export { COMPANY }
