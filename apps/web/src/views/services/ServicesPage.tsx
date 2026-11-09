import { getBusiness } from '@/shared/api/serverApi'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { ServicesCatalog } from '@/views/services/ui/ServicesCatalog'
import styles from './ServicesPage.module.css'

interface ServicesPageProps {
  slug: string
}

export const ServicesPage = async ({ slug }: ServicesPageProps) => {
  const { business, catalog } = await getBusiness(slug)

  return (
    <main className={styles.page}>
      <Container>
        <PageTitle title='Услуги.' subtitle={`${business.name}: цены и время известны заранее.`} />
      </Container>
      <ServicesCatalog business={business} catalog={catalog} />
    </main>
  )
}
