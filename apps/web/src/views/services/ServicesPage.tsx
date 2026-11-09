import { formatPrice } from '@/entities/booking'
import { getBusiness } from '@/shared/api/serverApi'
import { pluralize } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import styles from './ServicesPage.module.css'
import { ServicesCatalog } from './ui/ServicesCatalog'

interface ServicesPageProps {
  slug: string
}

export const ServicesPage = async ({ slug }: ServicesPageProps) => {
  const { business, catalog } = await getBusiness(slug)
  const minPrice = Math.min(...catalog.services.map((service) => service.price))

  return (
    <main className={styles.page}>
      <Container className={styles.hero}>
        <h1 className={styles.title}>
          Услуги и цены<span className={styles.titleMuted}> в {business.name}</span>
        </h1>
        <ul className={styles.facts}>
          <li>{pluralize(catalog.services.length, ['услуга', 'услуги', 'услуг'])}</li>
          {Number.isFinite(minPrice) && <li>от {formatPrice(minPrice)}</li>}
          <li>{pluralize(catalog.specialists.length, ['мастер', 'мастера', 'мастеров'])}</li>
          <li>цена и время известны заранее</li>
        </ul>
      </Container>
      <ServicesCatalog business={business} catalog={catalog} />
    </main>
  )
}
