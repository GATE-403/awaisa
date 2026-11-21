'use client'

import { formatPrice } from '@/entities/booking'
import { useT } from '@/shared/i18n'
import styles from '../ServicesPage.module.css'

interface ServicesFactsProps {
  servicesCount: number
  mastersCount: number
  minPrice: number
}

// «6 услуг · от 900 сом · 3 мастера» with bold figures, in the chosen language.
export const ServicesFacts = ({ servicesCount, mastersCount, minPrice }: ServicesFactsProps) => {
  const t = useT()
  const wordOf = (count: number, forms: [string, string, string]) =>
    t.count(count, forms).slice(String(count).length + 1)
  const [before, after] = t('от {price}').split('{price}')

  return (
    <p className={styles.facts}>
      <span>
        <strong>{servicesCount}</strong> {wordOf(servicesCount, ['услуга', 'услуги', 'услуг'])}
      </span>
      {Number.isFinite(minPrice) && (
        <span>
          {before}
          <strong>{formatPrice(minPrice)}</strong>
          {after}
        </span>
      )}
      <span>
        <strong>{mastersCount}</strong> {wordOf(mastersCount, ['мастер', 'мастера', 'мастеров'])}
      </span>
    </p>
  )
}
