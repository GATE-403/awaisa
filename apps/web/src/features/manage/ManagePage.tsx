'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { ArrowUpRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BusinessTile } from '@/common/components/BusinessTile/BusinessTile'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { TextTabs } from '@/common/components/TextTabs/TextTabs'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { HoursTab } from './components/HoursTab/HoursTab'
import { MastersTab } from './components/MastersTab/MastersTab'
import { ProfileTab } from './components/ProfileTab/ProfileTab'
import { ScheduleTab } from './components/ScheduleTab'
import { ServicesTab } from './components/ServicesTab/ServicesTab'
import { SetupProgress } from './components/SetupProgress/SetupProgress'
import { useManagedBusiness } from './hooks/useManagedBusiness'
import { useNewBookingAlerts } from './hooks/useNewBookingAlerts'
import styles from './ManagePage.module.css'
import { MANAGE_TABS, toManageTab } from './manageTabs'

interface ManagePageProps {
  slug: string
}

const FORBIDDEN = 403

export const ManagePage = ({ slug }: ManagePageProps) => {
  const session = useRequireSession()
  const searchParams = useSearchParams()
  const { data, error, run } = useManagedBusiness(slug, session.status === 'signedIn')
  const tab = toManageTab(searchParams.get('tab'))
  const alertsVersion = useNewBookingAlerts(slug, data !== null)

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
      <Container className={styles.content}>
        <header className={styles.header}>
          <div className={styles.identity}>
            {data ? (
              <BusinessTile name={data.business.name} size='lg' />
            ) : (
              <Skeleton className={styles.tileSkeleton} />
            )}
            {data ? (
              <h1 className={styles.title}>
                {data.business.name}.
                <span className={styles.titleMuted}>
                  {data.business.isPublished ? ' Кабинет' : ' Кабинет · страница скрыта'}
                </span>
              </h1>
            ) : (
              <Skeleton className={styles.titleSkeleton} />
            )}
          </div>
          <div className={styles.actions}>
            <NextLink href='/manage' className={styles.link}>
              Все бизнесы
            </NextLink>
            <ButtonLink
              variant='secondary'
              size='sm'
              render={<NextLink href={`/${slug}`} target='_blank' />}
            >
              Открыть страницу
              <ArrowUpRight weight='bold' aria-hidden />
            </ButtonLink>
          </div>
        </header>

        <TextTabs
          label='Разделы кабинета'
          items={MANAGE_TABS.map(({ value, label }) => ({
            href: `/manage/${slug}?tab=${value}`,
            label,
            isActive: tab === value,
          }))}
        />

        {data && <SetupProgress business={data.business} catalog={data.catalog} />}

        <div className={styles.main} data-wide={tab === 'schedule' || undefined}>
          {!data && <Skeleton className={styles.skeleton} />}
          {data && tab === 'schedule' && (
            <ScheduleTab
              slug={slug}
              business={data.business}
              catalog={data.catalog}
              refreshKey={alertsVersion}
            />
          )}
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
