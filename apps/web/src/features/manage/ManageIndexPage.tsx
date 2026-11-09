'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getMyBusinesses } from '@/common/api/clientApi'
import type { BusinessLink } from '@/common/api/types'
import { BusinessTile } from '@/common/components/BusinessTile/BusinessTile'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { EmptyState } from './components/EmptyState/EmptyState'
import styles from './ManageIndexPage.module.css'

export const ManageIndexPage = () => {
  const session = useRequireSession()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessLink[] | null>(null)
  const isSignedIn = session.status === 'signedIn'
  const [only] = businesses ?? []

  useEffect(() => {
    if (!isSignedIn) return

    const controller = new AbortController()
    getMyBusinesses(controller.signal)
      .then(setBusinesses)
      .catch(() => {
        if (!controller.signal.aborted) setBusinesses([])
      })

    return () => controller.abort()
  }, [isSignedIn])

  useEffect(() => {
    if (businesses?.length === 1 && only) router.replace(`/manage/${only.slug}`)
  }, [businesses, only, router])

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle size='sm' title='Мои бизнесы.' subtitle='Выберите, чем управлять.' />

        {(!businesses || businesses.length === 1) && <Skeleton className={styles.skeleton} />}

        {businesses?.length === 0 && (
          <EmptyState
            title='Пока нет страницы'
            text='Создайте страницу бизнеса — это пять минут, и клиенты смогут записываться.'
            action={
              <ButtonLink render={<NextLink href='/business/new' />}>Создать страницу</ButtonLink>
            }
          />
        )}

        {businesses && businesses.length > 1 && (
          <ul className={styles.list}>
            {businesses.map((business) => (
              <li key={business.slug}>
                <NextLink href={`/manage/${business.slug}`} className={styles.row}>
                  <BusinessTile name={business.name} />
                  <span className={styles.body}>
                    <span className={styles.name}>{business.name}</span>
                    <span className={styles.meta}>awaisa.kg/{business.slug}</span>
                  </span>
                  <span className={styles.status} data-hidden={!business.isPublished || undefined}>
                    {business.isPublished ? 'Открыта' : 'Скрыта'}
                  </span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </NextLink>
              </li>
            ))}
            <li>
              <NextLink href='/business/new' className={styles.row}>
                <span className={styles.addTile} aria-hidden='true'>
                  <Plus weight='bold' />
                </span>
                <span className={styles.add}>Создать страницу</span>
              </NextLink>
            </li>
          </ul>
        )}
      </Container>
    </main>
  )
}
