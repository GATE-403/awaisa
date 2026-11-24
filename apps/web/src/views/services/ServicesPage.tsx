import { msg } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { getBusiness, listServicePhotos } from '@/shared/api/serverApi'
import { initLingui } from '@/shared/i18n/server'
import { breadcrumbJsonLd } from '@/shared/lib/seo/breadcrumbJsonLd'
import { JsonLd } from '@/shared/lib/seo/JsonLd'
import { Container } from '@/shared/ui/Container/Container'
import styles from './ServicesPage.module.css'
import { ServicesCatalog } from './ui/ServicesCatalog'
import { ServicesFacts } from './ui/ServicesFacts'

interface ServicesPageProps {
  slug: string
}

export const ServicesPage = async ({ slug }: ServicesPageProps) => {
  const i18n = await initLingui()
  const [{ business, catalog }, servicePhotos] = await Promise.all([
    getBusiness(slug),
    listServicePhotos(slug),
  ])
  const minPrice = Math.min(...catalog.services.map((service) => service.price))

  return (
    <main className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { label: i18n._(msg`Catalogue`), href: '/' },
          { label: business.name, href: `/${business.slug}` },
          { label: i18n._(msg`Services and prices`), href: `/${business.slug}/services` },
        ])}
      />
      <Container className={styles.hero}>
        <h1 className={styles.title}>
          <Trans>Services and prices</Trans>
          <span className={styles.titleMuted}>
            {' '}
            <Trans>at {business.name}</Trans>
          </span>
        </h1>
        {/* The facts that decide, bold numbers in one quiet line - like the place's head. */}
        <ServicesFacts
          servicesCount={catalog.services.length}
          mastersCount={catalog.specialists.length}
          minPrice={minPrice}
        />
      </Container>
      <ServicesCatalog business={business} catalog={catalog} servicePhotos={servicePhotos} />
    </main>
  )
}
