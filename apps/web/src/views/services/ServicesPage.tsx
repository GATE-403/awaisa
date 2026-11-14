import { formatPrice } from '@/entities/booking'
import { getBusiness, listServicePhotos } from '@/shared/api/serverApi'
import { pluralWord } from '@/shared/lib/plural'
import { breadcrumbJsonLd } from '@/shared/lib/seo/breadcrumbJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import { Container } from '@/shared/ui/Container/Container'
import styles from './ServicesPage.module.css'
import { ServicesCatalog } from './ui/ServicesCatalog'

interface ServicesPageProps {
  slug: string
}

export const ServicesPage = async ({ slug }: ServicesPageProps) => {
  const [{ business, catalog }, servicePhotos] = await Promise.all([
    getBusiness(slug),
    listServicePhotos(slug),
  ])
  const minPrice = Math.min(...catalog.services.map((service) => service.price))

  return (
    <main className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { label: 'Каталог', href: '/' },
          { label: business.name, href: `/${business.slug}` },
          { label: 'Услуги и цены', href: `/${business.slug}/services` },
        ])}
      />
      <Container className={styles.hero}>
        <h1 className={styles.title}>
          Услуги и цены<span className={styles.titleMuted}> в {business.name}</span>
        </h1>
        {/* The facts that decide, bold numbers in one quiet line — like the place's head. */}
        <p className={styles.facts}>
          <span>
            <strong>{catalog.services.length}</strong>{' '}
            {pluralWord(catalog.services.length, ['услуга', 'услуги', 'услуг'])}
          </span>
          {Number.isFinite(minPrice) && (
            <span>
              от <strong>{formatPrice(minPrice)}</strong>
            </span>
          )}
          <span>
            <strong>{catalog.specialists.length}</strong>{' '}
            {pluralWord(catalog.specialists.length, ['мастер', 'мастера', 'мастеров'])}
          </span>
        </p>
      </Container>
      <ServicesCatalog business={business} catalog={catalog} servicePhotos={servicePhotos} />
    </main>
  )
}
