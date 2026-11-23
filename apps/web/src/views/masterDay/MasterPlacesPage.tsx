'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BusinessTile } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { getMasterPlaces } from '@/shared/api/clientApi'
import type { MasterPlace } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import styles from './MasterDayPage.module.css'

// Where the signed-in number works as a master; one place opens its day straight away.
interface MasterPlacesPageProps {
  /** Where this number works, read on the server (null: load in the browser). */
  initialPlaces?: MasterPlace[] | null
}

export const MasterPlacesPage = ({ initialPlaces = null }: MasterPlacesPageProps) => {
  const session = useRequireSession()
  const router = useRouter()
  const t = useT()
  const [places, setPlaces] = useState<MasterPlace[] | null>(initialPlaces)
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    if (!isSignedIn || initialPlaces) return
    const controller = new AbortController()
    getMasterPlaces(controller.signal)
      .then((loaded) => {
        const [only] = loaded
        if (loaded.length === 1 && only) router.replace(`/master/${only.slug}`)
        else setPlaces(loaded)
      })
      .catch(() => setPlaces([]))

    return () => controller.abort()
  }, [isSignedIn, router, initialPlaces])

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle size='sm' title={t('Мой день.')} subtitle={t('Где вы работаете мастером.')} />
        {!places && <Skeleton className={styles.skeleton} />}
        {places?.length === 0 && (
          <EmptyState
            title={t('Этот номер не привязан к мастеру')}
            text={t('Попросите владельца указать его в карточке мастера: Кабинет → Мастера.')}
          />
        )}
        {places && places.length > 0 && (
          <ul className={styles.agenda}>
            {places.map((place) => (
              <li key={place.slug}>
                <NextLink href={`/master/${place.slug}`} className={styles.place}>
                  <BusinessTile name={place.businessName} size='sm' />
                  <span className={styles.body}>
                    <span className={styles.service}>{place.businessName}</span>
                    <span className={styles.client}>{place.role || place.name}</span>
                  </span>
                  <CaretRight aria-hidden />
                </NextLink>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  )
}
