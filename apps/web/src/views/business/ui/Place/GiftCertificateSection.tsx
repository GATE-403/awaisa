'use client'

import { Button } from '@awaisa/ui/Button'
import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Business } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import styles from './GiftCertificate.module.css'
import { GiftCertificateSheet } from './GiftCertificateSheet'

interface GiftCertificateSectionProps {
  business: Business
  amounts: number[]
}

// «Gift card»: the amounts the owner put on sale; a tap opens the order on that one.
export const GiftCertificateSection = ({ business, amounts }: GiftCertificateSectionProps) => {
  const format = useFormat()
  const { t } = useLingui()
  const [chosen, setChosen] = useState<number | null>(null)

  return (
    <section id='gift' className={styles.section} aria-labelledby='place-gift'>
      <div>
        <h2 id='place-gift' className={styles.title}>
          <Trans>Gift card</Trans>
        </h2>
        <p className={styles.text}>
          <Trans>The code comes by SMS right after you pay by card.</Trans>
        </p>
      </div>
      <ul className={styles.amounts} aria-label={t`Gift card amounts`}>
        {amounts.map((amount) => (
          <li key={amount}>
            <Button variant='secondary' size='sm' onClick={() => setChosen(amount)}>
              {format.price(amount)}
            </Button>
          </li>
        ))}
      </ul>
      {chosen !== null && (
        <GiftCertificateSheet
          business={business}
          amounts={amounts}
          initialAmount={chosen}
          onClose={() => setChosen(null)}
        />
      )}
    </section>
  )
}
