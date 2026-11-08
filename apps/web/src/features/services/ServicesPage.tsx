import { getBusiness } from '@/common/api/serverApi'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { ServicesCatalog } from './components/ServicesCatalog'
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
