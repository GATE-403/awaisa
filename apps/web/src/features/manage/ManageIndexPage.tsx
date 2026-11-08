'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getMyBusinesses } from '@/common/api/clientApi'
import type { BusinessLink } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import formStyles from './components/manageForms.module.css'
import styles from './ManagePage.module.css'

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
        <PageTitle title='Мои бизнесы.' subtitle='Выберите, чем управлять.' />

        {(!businesses || businesses.length === 1) && <Skeleton className={styles.skeleton} />}

        {businesses?.length === 0 && (
          <div className={formStyles.card}>
            <p>У вас пока нет страницы бизнеса.</p>
            <ButtonLink render={<NextLink href='/business/new' />} size='lg'>
              Создать страницу
            </ButtonLink>
          </div>
        )}

        {businesses && businesses.length > 1 && (
          <ul className={formStyles.list}>
            {businesses.map((business) => (
              <li key={business.slug}>
                <NextLink href={`/manage/${business.slug}`} className={formStyles.row}>
                  <span className={formStyles.rowBody}>
                    <span>{business.name}</span>
                    <span className={formStyles.rowMeta}>awaisa.kg/{business.slug}</span>
                  </span>
                  {!business.isPublished && <span className={formStyles.badge}>Скрыта</span>}
                  <CaretRight className={formStyles.chevron} weight='bold' aria-hidden />
                </NextLink>
              </li>
            ))}
          </ul>
        )}

        <NextLink href='/business/new' className={styles.link}>
          Создать ещё одну страницу ›
        </NextLink>
      </Container>
    </main>
  )
}
