import { Suspense } from 'react'
import { getCatalog } from '@/common/api/serverApi'
import { NextSlotAside } from './NextSlotAside'
import styles from './StoreHero.module.css'

const PopularNextSlot = async () => {
  const { services } = await getCatalog()
  const service = services.find((item) => item.isPopular) ?? services[0]
  if (!service) return null

  return <NextSlotAside serviceId={service.id} serviceName={service.name} />
}

export const StoreHero = () => (
  <header className={styles.hero}>
    <h1 className={styles.title}>
      Запись<span className={styles.titleMuted}>. Свой мастер — в пару касаний.</span>
    </h1>
    <Suspense fallback={<div className={styles.asidePlaceholder} />}>
      <PopularNextSlot />
    </Suspense>
  </header>
)
