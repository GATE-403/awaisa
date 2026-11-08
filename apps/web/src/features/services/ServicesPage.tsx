import { Skeleton } from '@awaisa/ui/Skeleton'
import { Suspense } from 'react'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { ServicesCatalog } from './components/ServicesCatalog'
import styles from './ServicesPage.module.css'

const ServicesFallback = () => (
  <Container className={styles.groups}>
    <Skeleton style={{ height: 32, width: 280 }} />
    <Skeleton style={{ height: 360 }} />
  </Container>
)

export const ServicesPage = () => (
  <main className={styles.page}>
    <Container>
      <PageTitle title='Услуги.' subtitle='Цены и время известны заранее.' />
    </Container>
    <Suspense fallback={<ServicesFallback />}>
      <ServicesCatalog />
    </Suspense>
  </main>
)
