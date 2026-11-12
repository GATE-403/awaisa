import type { BusinessKind, BusinessPage, ReviewSummary, WorkingDay } from '@/shared/api/types'
import { absoluteUrl } from './siteUrl'

const SCHEMA_TYPES: Record<BusinessKind, string> = {
  beauty: 'BeautySalon',
  barber: 'HairSalon',
  nails: 'NailSalon',
  spa: 'DaySpa',
  health: 'MedicalBusiness',
  other: 'LocalBusiness',
}

const SCHEMA_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const LAST_MINUTE_OF_DAY = 24 * 60 - 1

const toSchemaTime = (minutes: number) => {
  const clamped = Math.min(minutes, LAST_MINUTE_OF_DAY)
  const hours = Math.floor(clamped / 60)
  return `${String(hours).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

const toOpeningHours = (hours: WorkingDay[]) =>
  hours
    .filter((day) => SCHEMA_WEEKDAYS[day.weekday] && day.closesMinutes > day.opensMinutes)
    .map((day) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_WEEKDAYS[day.weekday]}`,
      opens: toSchemaTime(day.opensMinutes),
      closes: toSchemaTime(day.closesMinutes),
    }))

const buildBusinessJsonLd = ({ business, catalog }: BusinessPage, reviews: ReviewSummary) => {
  const url = absoluteUrl(`/${business.slug}`)
  const pinned = business.branches.find(
    (branch) => branch.latitude !== null && branch.longitude !== null,
  )
  const services = catalog.services.filter((service) => service.isActive !== false)
  const images = [business.coverUrl, ...business.photos]
    .filter((image): image is string => Boolean(image))
    .map(absoluteUrl)
  const toOffer = (service: (typeof services)[number]) => ({
    '@type': 'Offer',
    price: service.price,
    priceCurrency: 'KGS',
    url: absoluteUrl(`/${business.slug}/book?service=${encodeURIComponent(service.id)}`),
    itemOffered: {
      '@type': 'Service',
      name: service.name,
      ...(service.description && { description: service.description }),
    },
  })
  const sections = catalog.categories
    .map((category) => ({
      '@type': 'OfferCatalog',
      name: category.name,
      itemListElement: services
        .filter((service) => service.categoryId === category.id)
        .map(toOffer),
    }))
    .filter((section) => section.itemListElement.length > 0)

  return {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPES[business.kind],
    '@id': url,
    url,
    name: business.name,
    ...(business.description && { description: business.description }),
    ...(images.length > 0 && { image: images }),
    ...(business.phone && { telephone: business.phone }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city || 'Бишкек',
      addressCountry: 'KG',
    },
    ...(pinned && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: pinned.latitude,
        longitude: pinned.longitude,
      },
    }),
    openingHoursSpecification: toOpeningHours(business.hours),
    currenciesAccepted: 'KGS',
    ...(reviews.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.round(reviews.average * 10) / 10,
        reviewCount: reviews.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(sections.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Услуги и цены',
        itemListElement: sections,
      },
    }),
  }
}

export { buildBusinessJsonLd }
