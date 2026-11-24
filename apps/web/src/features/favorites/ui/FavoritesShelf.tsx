'use client'

import { Heart } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useState } from 'react'
import { NextFreeProvider } from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import { listOffersByIds } from '@/shared/api/clientApi'
import type { Offer } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { useFavorites } from '../model/useFavorites'
import { FavoriteButton } from './FavoriteButton'
import styles from './FavoritesShelf.module.css'

// «Избранное» in the profile: the services hearted anywhere, as the catalog's cards in one row
// (newest first); a heart takes one off. With none yet, one quiet line says how to add them.
interface FavoritesShelfProps {
  /** `grid` inside the profile's «Избранное» tab (the tab names it, no heading). */
  layout?: 'row' | 'grid'
}

export const FavoritesShelf = ({ layout = 'row' }: FavoritesShelfProps) => {
  const t = useT()
  const { ids } = useFavorites()
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const key = ids.join(',')

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch only when the set changes
  useEffect(() => {
    if (ids.length === 0) {
      setOffers([])
      return
    }
    const controller = new AbortController()
    listOffersByIds(ids, controller.signal)
      .then(setOffers)
      .catch(() => undefined)
    return () => controller.abort()
  }, [key])

  const order = [...ids].reverse()
  const shown = (offers ?? [])
    .filter((offer) => ids.includes(offer.id))
    .sort((first, second) => order.indexOf(first.id) - order.indexOf(second.id))

  return (
    <section className={styles.shelf} aria-labelledby='favorites-title'>
      <div className={styles.head} data-hidden={layout === 'grid' || undefined}>
        <h2 id='favorites-title' className={styles.title}>
          {t('Избранное')}
        </h2>
        {shown.length > 0 && <span className={styles.count}>{shown.length}</span>}
      </div>
      {offers !== null && shown.length === 0 ? (
        <EmptyState
          icon={<Heart className={styles.heart} />}
          title={t('Сохраняйте услуги')}
          text={
            <>
              {t('Нажмите ♡ на услуге в')} <NextLink href='/'>{t('каталоге')}</NextLink>
              {t(' - она появится здесь.')}
            </>
          }
        />
      ) : (
        <NextFreeProvider slugs={[...new Set(shown.map((offer) => offer.slug))]}>
          <ul
            className={layout === 'grid' ? styles.grid : styles.track}
            data-edge-fade={layout === 'grid' ? undefined : ''}
          >
            {shown.map((offer) => (
              <li key={offer.id}>
                <OfferCard
                  offer={offer}
                  action={<FavoriteButton id={offer.id} label={offer.name} />}
                />
              </li>
            ))}
          </ul>
        </NextFreeProvider>
      )}
    </section>
  )
}
