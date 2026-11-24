'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretLeft } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useRequireSession } from '@/entities/session'
import { useNewBookingAlerts } from '@/features/bookingAlerts'
import type { BusinessPage } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useManagedBusiness } from '@/views/manage/model/useManagedBusiness'
import { AnalyticsTab } from '@/views/manage/ui/AnalyticsTab/AnalyticsTab'
import { BillingTab } from '@/views/manage/ui/BillingTab/BillingTab'
import { BranchesTab } from '@/views/manage/ui/BranchesTab/BranchesTab'
import { CashDeskTab } from '@/views/manage/ui/CashDeskTab/CashDeskTab'
import { ClientsTab } from '@/views/manage/ui/ClientsTab/ClientsTab'
import { FiscalTab } from '@/views/manage/ui/FiscalTab/FiscalTab'
import { LoyaltyTab } from '@/views/manage/ui/LoyaltyTab/LoyaltyTab'
import { NotificationsTab } from '@/views/manage/ui/NotificationsTab/NotificationsTab'
import { PageTab } from '@/views/manage/ui/PageTab/PageTab'
import { PlanLock } from '@/views/manage/ui/PlanLock/PlanLock'
import { PromotionsTab } from '@/views/manage/ui/PromotionsTab/PromotionsTab'
import { ReviewsTab } from '@/views/manage/ui/ReviewsTab/ReviewsTab'
import { ScheduleTab } from '@/views/manage/ui/ScheduleTab'
import { SettingsNav } from '@/views/manage/ui/SettingsNav/SettingsNav'
import { SetupProgress } from '@/views/manage/ui/SetupProgress/SetupProgress'
import { StockTab } from '@/views/manage/ui/StockTab/StockTab'
import { TeamTab } from '@/views/manage/ui/TeamTab/TeamTab'
import { CabinetBar } from '@/widgets/CabinetBar'
import styles from './ManagePage.module.css'
import {
  isSettingsTab,
  isTabAllowed,
  MAIN_TABS,
  SETTINGS_TABS,
  tabFeature,
  toManageTab,
} from './manageTabs'
import { ManageRoleContext } from './model/useManageRole'
import { PlanAccessContext } from './model/usePlanAccess'

interface ManagePageProps {
  slug: string
  /** The cabinet's data read on the server for this request (null: load in the browser). */
  initialData?: BusinessPage | null
}

const FORBIDDEN = 403

export const ManagePage = ({ slug, initialData = null }: ManagePageProps) => {
  const session = useRequireSession()
  const t = useT()
  const searchParams = useSearchParams()
  const { data, error, run } = useManagedBusiness(slug, session.status === 'signedIn', initialData)
  const role = data?.role ?? 'owner'
  const requested = toManageTab(searchParams.get('tab'))
  const allowed = isTabAllowed(requested, role) ? requested : 'schedule'
  const isSettings = isSettingsTab(allowed)
  // The settings root opens the first section beside the sidebar; phones show only the list.
  const tab = allowed === 'settings' ? 'branches' : allowed
  const alertsVersion = useNewBookingAlerts(slug, data !== null)
  const access = data?.access ?? null
  const feature = tabFeature(tab)
  // A section the plan does not open shows what it would give and the way to the plan.
  const lockedFeature = access && feature && !access.features.includes(feature) ? feature : null

  if (error) {
    return (
      <main className={styles.page}>
        <CabinetBar slug={slug} title={null} isPublished />
        <Container size='sm' className={styles.error}>
          <PageTitle
            size='sm'
            title={error.status === FORBIDDEN ? t('Нет доступа.') : t('Не получилось.')}
            subtitle={
              error.status === FORBIDDEN
                ? t('Этим бизнесом управляет другой аккаунт.')
                : error.message
            }
          />
          <NextLink href='/manage' className={styles.link}>
            {t('Мои бизнесы')} ›
          </NextLink>
        </Container>
      </main>
    )
  }

  return (
    <ManageRoleContext value={role}>
      <PlanAccessContext value={access}>
        <main className={styles.page}>
          <CabinetBar
            slug={slug}
            title={data?.business.name ?? null}
            logoUrl={data?.business.logoUrl}
            isPublished={data?.business.isPublished ?? true}
            nav={
              <TextTabs
                label={t('Разделы кабинета')}
                items={[
                  ...MAIN_TABS.filter(({ value }) => isTabAllowed(value, role)).map(
                    ({ value, label }) => ({
                      href: `/manage/${slug}?tab=${value}`,
                      label: t(label),
                      isActive: tab === value,
                    }),
                  ),
                  ...(role === 'owner'
                    ? [
                        {
                          href: `/manage/${slug}?tab=settings`,
                          label: t('Настройки'),
                          isActive: isSettings,
                        },
                      ]
                    : []),
                ]}
              />
            }
          />
          <Container className={styles.content}>
            <div
              className={styles.layout}
              data-settings={isSettings || undefined}
              data-root={allowed === 'settings' || undefined}
            >
              {isSettings && (
                <aside className={styles.sidebar}>
                  {data && (
                    <SettingsNav
                      slug={slug}
                      current={tab}
                      business={data.business}
                      catalog={data.catalog}
                    />
                  )}
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
                      aria-label={t('Назад к настройкам')}
                    >
                      <CaretLeft aria-hidden />
                      {t('Назад')}
                    </NextLink>
                    <h2 className={styles.backTitle}>
                      {t(SETTINGS_TABS.find((item) => item.value === tab)?.label ?? '')}
                    </h2>
                  </div>
                )}
                {/* In the section's own column, so it lines up with what is under it. */}
                {data && role === 'owner' && (
                  <div className={styles.setup}>
                    <SetupProgress business={data.business} catalog={data.catalog} />
                  </div>
                )}
                {!data && <Skeleton className={styles.skeleton} />}
                {lockedFeature && <PlanLock slug={slug} feature={lockedFeature} />}
                {data && tab === 'schedule' && (
                  <ScheduleTab
                    slug={slug}
                    business={data.business}
                    catalog={data.catalog}
                    refreshKey={alertsVersion}
                  />
                )}
                {data && !lockedFeature && tab === 'analytics' && (
                  <AnalyticsTab slug={slug} business={data.business} catalog={data.catalog} />
                )}
                {data && !lockedFeature && tab === 'cash' && (
                  <CashDeskTab slug={slug} business={data.business} catalog={data.catalog} />
                )}
                {data && tab === 'clients' && (
                  <ClientsTab
                    slug={slug}
                    businessName={data.business.name}
                    specialists={data.catalog.specialists}
                    branches={data.business.branches.filter((branch) => branch.isActive !== false)}
                  />
                )}
                {data && tab === 'reviews' && (
                  <ReviewsTab slug={slug} businessName={data.business.name} />
                )}
                {data && tab === 'branches' && (
                  <BranchesTab slug={slug} branches={data.business.branches} run={run} />
                )}
                {data && tab === 'notifications' && (
                  <NotificationsTab slug={slug} specialists={data.catalog.specialists} />
                )}
                {data && !lockedFeature && tab === 'promotions' && (
                  <PromotionsTab slug={slug} catalog={data.catalog} />
                )}
                {data && !lockedFeature && tab === 'loyalty' && (
                  <LoyaltyTab slug={slug} catalog={data.catalog} />
                )}
                {data && !lockedFeature && tab === 'stock' && (
                  <StockTab slug={slug} catalog={data.catalog} />
                )}
                {!lockedFeature && tab === 'fiscal' && <FiscalTab slug={slug} />}
                {data && tab === 'team' && <TeamTab slug={slug} />}
                {data && tab === 'billing' && <BillingTab slug={slug} />}
                {data && tab === 'page' && (
                  <PageTab slug={slug} business={data.business} catalog={data.catalog} run={run} />
                )}
              </div>
            </div>
          </Container>
        </main>
      </PlanAccessContext>
    </ManageRoleContext>
  )
}
