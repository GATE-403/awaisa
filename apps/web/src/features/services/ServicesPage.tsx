import { Skeleton } from '@awaisa/ui/Skeleton'
import { Suspense } from 'react'
import { Container } from '@/common/components/Container/Container'
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
      <h1 className={styles.title}>Услуги</h1>
    </Container>
    <Suspense fallback={<ServicesFallback />}>
      <ServicesCatalog />
    </Suspense>
  </main>
)
