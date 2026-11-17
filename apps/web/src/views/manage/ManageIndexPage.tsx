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
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { BusinessPickerCard } from '@/views/manage/ui/BusinessPickerCard/BusinessPickerCard'
import { CabinetBar } from '@/widgets/CabinetBar'
import styles from './ManageIndexPage.module.css'

interface ManageIndexPageProps {
  /** The account's businesses, read on the server (null: load in the browser). */
  initialBusinesses?: BusinessLink[] | null
}

export const ManageIndexPage = ({ initialBusinesses = null }: ManageIndexPageProps) => {
  const session = useRequireSession()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessLink[] | null>(initialBusinesses)
  const isSignedIn = session.status === 'signedIn'
  const [only] = businesses ?? []

  useEffect(() => {
    if (!isSignedIn || initialBusinesses) return

    const controller = new AbortController()
    getMyBusinesses(controller.signal)
      .then(setBusinesses)
      .catch(() => {
        if (!controller.signal.aborted) setBusinesses([])
      })

    return () => controller.abort()
  }, [isSignedIn, initialBusinesses])

  useEffect(() => {
    if (businesses?.length === 1 && only) router.replace(`/manage/${only.slug}`)
  }, [businesses, only, router])

  return (
    <main className={styles.page}>
      {/* The owner's side looks like the cabinet: its own toolbar, not the client's header. */}
      <CabinetBar title='Мои бизнесы' />
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
          <ul className={styles.list}>
            {businesses.map((business) => (
              <li key={business.slug}>
                <BusinessPickerCard business={business} />
              </li>
            ))}
            <li>
              <NextLink href='/business/new' className={styles.addRow}>
                <span className={styles.addTile} aria-hidden='true'>
                  <Plus weight='bold' />
                </span>
                Новая страница
              </NextLink>
            </li>
          </ul>
        )}
      </Container>
    </main>
  )
}
