'use client'

import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useFormat } from '@/shared/i18n'
import styles from '../ServicesPage.module.css'

interface ServicesFactsProps {
  servicesCount: number
  mastersCount: number
  minPrice: number
}

// «6 services · from 900 som · 3 specialists» with bold figures: the plural forms leave the
// number out, so it can stand bold before the word.
export const ServicesFacts = ({ servicesCount, mastersCount, minPrice }: ServicesFactsProps) => {
  const format = useFormat()
  const { t } = useLingui()
  const price = Number.isFinite(minPrice) ? format.price(minPrice) : null

  return (
    <p className={styles.facts}>
      <span>
        <strong>{servicesCount}</strong>{' '}
        {t`${plural(servicesCount, { one: 'service', other: 'services' })}`}
      </span>
      {price && (
        <span>
          <Trans>
            from <strong>{price}</strong>
          </Trans>
        </span>
      )}
      <span>
        <strong>{mastersCount}</strong>{' '}
        {t`${plural(mastersCount, { one: 'specialist', other: 'specialists' })}`}
      </span>
    </p>
  )
}
