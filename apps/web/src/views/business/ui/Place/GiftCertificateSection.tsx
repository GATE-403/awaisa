'use client'

import { Button } from '@awaisa/ui/Button'
import { useState } from 'react'
import { formatPrice } from '@/entities/booking'
import type { Business } from '@/shared/api/types'
import styles from './GiftCertificate.module.css'
import { GiftCertificateSheet } from './GiftCertificateSheet'

interface GiftCertificateSectionProps {
  business: Business
  amounts: number[]
}

// «Gift card»: the amounts the owner put on sale; a tap opens the order on that one.
export const GiftCertificateSection = ({ business, amounts }: GiftCertificateSectionProps) => {
  const [chosen, setChosen] = useState<number | null>(null)

  return (
    <section id='gift' className={styles.section} aria-labelledby='place-gift'>
      <div>
        <h2 id='place-gift' className={styles.title}>
          Gift card
        </h2>
        <p className={styles.text}>The code comes by SMS right after you pay by card.</p>
      </div>
      <ul className={styles.amounts} aria-label='Gift card amounts'>
        {amounts.map((amount) => (
          <li key={amount}>
            <Button variant='secondary' size='sm' onClick={() => setChosen(amount)}>
              {formatPrice(amount)}
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
