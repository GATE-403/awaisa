'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BusinessTile } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { useNewBookingAlerts } from '@/features/bookingAlerts'
import type { BusinessPage } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useManagedBusiness } from '@/views/manage/model/useManagedBusiness'
import { AnalyticsTab } from '@/views/manage/ui/AnalyticsTab/AnalyticsTab'
import { BranchesTab } from '@/views/manage/ui/BranchesTab/BranchesTab'
import { CabinetBar } from '@/views/manage/ui/CabinetBar/CabinetBar'
import { ClientsTab } from '@/views/manage/ui/ClientsTab/ClientsTab'
import { HoursTab } from '@/views/manage/ui/HoursTab/HoursTab'
import { LoyaltyTab } from '@/views/manage/ui/LoyaltyTab/LoyaltyTab'
import { MastersTab } from '@/views/manage/ui/MastersTab/MastersTab'
import { NotificationsTab } from '@/views/manage/ui/NotificationsTab/NotificationsTab'
import { ProfileTab } from '@/views/manage/ui/ProfileTab/ProfileTab'
import { PromotionsTab } from '@/views/manage/ui/PromotionsTab/PromotionsTab'
import { ReviewsTab } from '@/views/manage/ui/ReviewsTab/ReviewsTab'
import { ScheduleTab } from '@/views/manage/ui/ScheduleTab'
import { ServicesTab } from '@/views/manage/ui/ServicesTab/ServicesTab'
import { SetupProgress } from '@/views/manage/ui/SetupProgress/SetupProgress'
import styles from './ManagePage.module.css'
import { isSettingsTab, MAIN_TABS, SETTINGS_TABS, toManageTab } from './manageTabs'

interface ManagePageProps {
  slug: string
  /** The cabinet's data read on the server for this request (null: load in the browser). */
  initialData?: BusinessPage | null
}

const FORBIDDEN = 403

export const ManagePage = ({ slug, initialData = null }: ManagePageProps) => {
  const session = useRequireSession()
  const searchParams = useSearchParams()
  const { data, error, run } = useManagedBusiness(slug, session.status === 'signedIn', initialData)
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
              <BusinessTile name={data.business.name} size='md' />
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
          items={[
            ...MAIN_TABS.map(({ value, label }) => ({
              href: `/manage/${slug}?tab=${value}`,
              label,
              isActive: tab === value,
            })),
            {
              href: `/manage/${slug}?tab=services`,
              label: 'Настройки',
              isActive: isSettingsTab(tab),
            },
          ]}
        />
        {isSettingsTab(tab) && (
          <nav aria-label='Настройки' className={styles.subnav}>
            {SETTINGS_TABS.map(({ value, label }) => (
              <NextLink
                key={value}
                href={`/manage/${slug}?tab=${value}`}
                scroll={false}
                className={styles.subtab}
                aria-current={tab === value ? 'page' : undefined}
              >
                {label}
              </NextLink>
            ))}
          </nav>
        )}

        {data && <SetupProgress business={data.business} catalog={data.catalog} />}

        <div
          className={styles.main}
          data-wide={tab === 'schedule' || tab === 'analytics' || undefined}
        >
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
          {data && tab === 'clients' && <ClientsTab slug={slug} />}
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
              businessHours={data.business.hours}
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
          {data && tab === 'notifications' && <NotificationsTab slug={slug} />}
          {data && tab === 'promotions' && <PromotionsTab slug={slug} catalog={data.catalog} />}
          {data && tab === 'loyalty' && <LoyaltyTab slug={slug} catalog={data.catalog} />}
          {data && tab === 'profile' && (
            <ProfileTab slug={slug} business={data.business} run={run} />
          )}
        </div>
      </Container>
    </main>
  )
}
