'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { ArrowUpRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { HoursTab } from './components/HoursTab/HoursTab'
import { ManageNav } from './components/ManageNav/ManageNav'
import { MastersTab } from './components/MastersTab/MastersTab'
import { ProfileTab } from './components/ProfileTab/ProfileTab'
import { ScheduleTab } from './components/ScheduleTab'
import { ServicesTab } from './components/ServicesTab/ServicesTab'
import { SetupProgress } from './components/SetupProgress/SetupProgress'
import { useManagedBusiness } from './hooks/useManagedBusiness'
import styles from './ManagePage.module.css'
import { toManageTab } from './manageTabs'

interface ManagePageProps {
  slug: string
}

const FORBIDDEN = 403

export const ManagePage = ({ slug }: ManagePageProps) => {
  const session = useRequireSession()
  const searchParams = useSearchParams()
  const { data, error, run } = useManagedBusiness(slug, session.status === 'signedIn')
  const tab = toManageTab(searchParams.get('tab'))

  if (error) {
    return (
      <main className={styles.page}>
        <Container size='sm' className={styles.error}>
          <PageTitle
            size='sm'
            title={error.status === FORBIDDEN ? 'Нет доступа.' : 'Не получилось.'}
            subtitle={
              error.status === FORBIDDEN ? 'Этим бизнесом управляет другой аккаунт.' : error.message
            }
          />
          <NextLink href='/manage' className={styles.link}>
            Мои бизнесы ›
          </NextLink>
        </Container>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Container className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.identity}>
            <p className={styles.eyebrow}>Кабинет</p>
            {data ? (
              <h1 className={styles.name}>{data.business.name}</h1>
            ) : (
              <Skeleton className={styles.nameSkeleton} />
            )}
            {data && (
              <NextLink href={`/${data.business.slug}`} target='_blank' className={styles.link}>
                awaisa.kg/{data.business.slug}
                <ArrowUpRight weight='bold' aria-hidden />
              </NextLink>
            )}
            {data && !data.business.isPublished && (
              <span className={styles.hidden}>Страница скрыта</span>
            )}
          </div>
          <ManageNav slug={slug} active={tab} />
          {data && (
            <div className={styles.progress}>
              <SetupProgress business={data.business} catalog={data.catalog} />
            </div>
          )}
        </aside>

        <div className={styles.main}>
          {!data && <Skeleton className={styles.skeleton} />}
          {data && tab === 'schedule' && <ScheduleTab slug={slug} business={data.business} />}
          {data && tab === 'services' && (
            <ServicesTab slug={slug} catalog={data.catalog} run={run} />
          )}
          {data && tab === 'masters' && <MastersTab slug={slug} catalog={data.catalog} run={run} />}
          {data && tab === 'hours' && (
            <HoursTab
              key={JSON.stringify([data.business.hours, data.business.slotMinutes])}
              slug={slug}
              business={data.business}
              run={run}
            />
          )}
          {data && tab === 'profile' && (
            <ProfileTab slug={slug} business={data.business} run={run} />
          )}
        </div>
      </Container>
    </main>
  )
}
