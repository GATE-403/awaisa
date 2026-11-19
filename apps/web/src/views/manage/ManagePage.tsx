'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretLeft } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRequireSession } from '@/entities/session'
import { useNewBookingAlerts } from '@/features/bookingAlerts'
import type { BusinessPage } from '@/shared/api/types'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useManagedBusiness } from '@/views/manage/model/useManagedBusiness'
import { AnalyticsTab } from '@/views/manage/ui/AnalyticsTab/AnalyticsTab'
import { BranchesTab } from '@/views/manage/ui/BranchesTab/BranchesTab'
import { ClientsTab } from '@/views/manage/ui/ClientsTab/ClientsTab'
import { HoursTab } from '@/views/manage/ui/HoursTab/HoursTab'
import { LoyaltyTab } from '@/views/manage/ui/LoyaltyTab/LoyaltyTab'
import { MastersTab } from '@/views/manage/ui/MastersTab/MastersTab'
import { NotificationsTab } from '@/views/manage/ui/NotificationsTab/NotificationsTab'
import { PageTab } from '@/views/manage/ui/PageTab/PageTab'
import { PromotionsTab } from '@/views/manage/ui/PromotionsTab/PromotionsTab'
import { ReviewsTab } from '@/views/manage/ui/ReviewsTab/ReviewsTab'
import { ScheduleTab } from '@/views/manage/ui/ScheduleTab'
import { ServicesTab } from '@/views/manage/ui/ServicesTab/ServicesTab'
import { SettingsNav } from '@/views/manage/ui/SettingsNav/SettingsNav'
import { SetupProgress } from '@/views/manage/ui/SetupProgress/SetupProgress'
import { StockTab } from '@/views/manage/ui/StockTab/StockTab'
import { TeamTab } from '@/views/manage/ui/TeamTab/TeamTab'
import { CabinetBar } from '@/widgets/CabinetBar'
import styles from './ManagePage.module.css'
import { isSettingsTab, isTabAllowed, MAIN_TABS, SETTINGS_TABS, toManageTab } from './manageTabs'
import { ManageRoleContext } from './model/useManageRole'

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
  const role = data?.role ?? 'owner'
  const requested = toManageTab(searchParams.get('tab'))
  const allowed = isTabAllowed(requested, role) ? requested : 'schedule'
  const isSettings = isSettingsTab(allowed)
  // The settings root opens the first section beside the sidebar; phones show only the list.
  const tab = allowed === 'settings' ? 'services' : allowed
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
    <ManageRoleContext value={role}>
      <main className={styles.page}>
        <CabinetBar
          slug={slug}
          title={data?.business.name ?? null}
          logoUrl={data?.business.logoUrl}
          isPublished={data?.business.isPublished ?? true}
          nav={
            <TextTabs
              label='Разделы кабинета'
              items={[
                ...MAIN_TABS.filter(({ value }) => isTabAllowed(value, role)).map(
                  ({ value, label }) => ({
                    href: `/manage/${slug}?tab=${value}`,
                    label,
                    isActive: tab === value,
                  }),
                ),
                ...(role === 'owner'
                  ? [
                      {
                        href: `/manage/${slug}?tab=settings`,
                        label: 'Настройки',
                        isActive: isSettings,
                      },
                    ]
                  : []),
              ]}
            />
          }
        />
        <Container className={styles.content}>
          {data && role === 'owner' && (
            <SetupProgress business={data.business} catalog={data.catalog} />
          )}

          <div
            className={styles.layout}
            data-settings={isSettings || undefined}
            data-root={allowed === 'settings' || undefined}
          >
            {isSettings && (
              <aside className={styles.sidebar}>
                <SettingsNav slug={slug} current={allowed === 'settings' ? null : tab} />
              </aside>
            )}
            <div
              className={styles.main}
              data-wide={tab === 'schedule' || tab === 'analytics' || undefined}
            >
              {isSettings && (
                <div className={styles.back}>
                  <NextLink
                    href={`/manage/${slug}?tab=settings`}
                    scroll={false}
                    className={styles.backLink}
                    aria-label='Назад к настройкам'
                  >
                    <CaretLeft weight='bold' aria-hidden />
                    Назад
                  </NextLink>
                  <h2 className={styles.backTitle}>
                    {SETTINGS_TABS.find((item) => item.value === tab)?.label}
                  </h2>
                </div>
              )}
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
              {data && tab === 'clients' && (
                <ClientsTab slug={slug} businessName={data.business.name} />
              )}
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
              {data && tab === 'stock' && <StockTab slug={slug} catalog={data.catalog} />}
              {data && tab === 'team' && <TeamTab slug={slug} />}
              {data && tab === 'page' && (
                <PageTab slug={slug} business={data.business} catalog={data.catalog} run={run} />
              )}
            </div>
          </div>
        </Container>
      </main>
    </ManageRoleContext>
  )
}
