'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BusinessTile } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { useNewBookingAlerts } from '@/features/bookingAlerts'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useManagedBusiness } from '@/views/manage/model/useManagedBusiness'
import { AnalyticsTab } from '@/views/manage/ui/AnalyticsTab/AnalyticsTab'
import { BranchesTab } from '@/views/manage/ui/BranchesTab/BranchesTab'
import { CabinetBar } from '@/views/manage/ui/CabinetBar/CabinetBar'
import { HoursTab } from '@/views/manage/ui/HoursTab/HoursTab'
import { MastersTab } from '@/views/manage/ui/MastersTab/MastersTab'
import { ProfileTab } from '@/views/manage/ui/ProfileTab/ProfileTab'
import { ReviewsTab } from '@/views/manage/ui/ReviewsTab/ReviewsTab'
import { ScheduleTab } from '@/views/manage/ui/ScheduleTab'
import { ServicesTab } from '@/views/manage/ui/ServicesTab/ServicesTab'
import { SetupProgress } from '@/views/manage/ui/SetupProgress/SetupProgress'
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
        <CabinetBar slug={slug} title={null} isPublished />
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
      <CabinetBar
        slug={slug}
        title={data?.business.name ?? null}
        isPublished={data?.business.isPublished ?? true}
      />
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
          {data && tab === 'analytics' && <AnalyticsTab slug={slug} business={data.business} />}
          {data && tab === 'reviews' && (
            <ReviewsTab slug={slug} businessName={data.business.name} />
          )}
          {data && tab === 'services' && (
            <ServicesTab slug={slug} catalog={data.catalog} run={run} />
          )}
          {data && tab === 'masters' && (
            <MastersTab
              slug={slug}
              catalog={data.catalog}
              branches={data.business.branches}
              run={run}
            />
          )}
          {data && tab === 'branches' && (
            <BranchesTab slug={slug} branches={data.business.branches} run={run} />
          )}
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
