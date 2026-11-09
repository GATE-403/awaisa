'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Plus } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRequireSession } from '@/entities/session'
import { getMyBusinesses } from '@/shared/api/clientApi'
import type { BusinessLink } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { BusinessPickerCard } from '@/views/manage/ui/BusinessPickerCard/BusinessPickerCard'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
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
      <Container size='md' className={styles.content}>
        <PageTitle size='sm' title='Мои бизнесы.' subtitle='Выберите, чем управлять.' />

        {(!businesses || businesses.length === 1) && <Skeleton className={styles.skeleton} />}

        {businesses?.length === 0 && (
          <EmptyState
            title='Создайте первую страницу'
            text='Создайте страницу бизнеса — это пять минут, и клиенты смогут записываться.'
            action={
              <ButtonLink render={<NextLink href='/business/new' />}>Создать страницу</ButtonLink>
            }
          />
        )}

        {businesses && businesses.length > 1 && (
          <ul className={styles.grid}>
            {businesses.map((business) => (
              <li key={business.slug}>
                <BusinessPickerCard business={business} />
              </li>
            ))}
            <li>
              <NextLink href='/business/new' className={styles.addCard}>
                <span className={styles.addTile} aria-hidden='true'>
                  <Plus weight='bold' />
                </span>
                <span className={styles.addTitle}>Новая страница</span>
                <span className={styles.addText}>Ещё один салон или своё дело — пять минут.</span>
              </NextLink>
            </li>
          </ul>
        )}
      </Container>
    </main>
  )
}
