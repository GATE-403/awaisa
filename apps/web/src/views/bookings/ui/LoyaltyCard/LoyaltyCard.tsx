'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Gift } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { useSession } from '@/entities/session'
import { getMyLoyalty } from '@/shared/api/clientApi'
import type { MyLoyalty } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
import styles from './LoyaltyCard.module.css'

// «Bonuses and memberships»: what the signed-in client has to spend, per place.
export const LoyaltyCard = () => {
  const format = useFormat()
  const { t } = useLingui()
  const session = useSession()
  const [places, setPlaces] = useState<MyLoyalty>([])
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    if (!isSignedIn) return
    const controller = new AbortController()
    getMyLoyalty(controller.signal)
      .then(setPlaces)
      .catch(() => undefined)
    return () => controller.abort()
  }, [isSignedIn])

  if (places.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby='loyalty-title'>
      <h2 id='loyalty-title' className={styles.title}>
        {t`Bonuses and memberships`}
      </h2>
      <ul className={styles.list}>
        {places.map((place) => (
          <li key={place.slug}>
            <NextLink href={`/${place.slug}/book`} className={styles.row}>
              <BusinessTile name={place.name} size='sm' />
              <span className={styles.text}>
                <span className={styles.name}>{place.name}</span>
                <span className={styles.meta}>
                  {[
                    ...place.subscriptions.map(
                      (item) =>
                        `${item.title}: ${t`${plural(item.visitsLeft, { one: '# visit', other: '# visits' })}`}`,
                    ),
                  ].join(' · ') || t`Spend on your next visit`}
                </span>
              </span>
              {place.bonusBalance > 0 && (
                <span className={styles.balance}>
                  <Gift aria-hidden />
                  {format.price(place.bonusBalance)}
                </span>
              )}
            </NextLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
