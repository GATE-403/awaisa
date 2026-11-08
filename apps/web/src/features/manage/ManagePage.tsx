'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@awaisa/ui/Tabs'
import NextLink from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { HoursTab } from './components/HoursTab/HoursTab'
import { MastersTab } from './components/MastersTab/MastersTab'
import { ProfileTab } from './components/ProfileTab/ProfileTab'
import { ScheduleTab } from './components/ScheduleTab'
import { ServicesTab } from './components/ServicesTab/ServicesTab'
import { SetupChecklist } from './components/SetupChecklist/SetupChecklist'
import { useManagedBusiness } from './hooks/useManagedBusiness'
import styles from './ManagePage.module.css'

interface ManagePageProps {
  slug: string
}

const TABS = [
  { value: 'schedule', label: 'Расписание' },
  { value: 'services', label: 'Услуги' },
  { value: 'masters', label: 'Мастера' },
  { value: 'hours', label: 'График' },
  { value: 'profile', label: 'Профиль' },
] as const

type TabValue = (typeof TABS)[number]['value']

const FORBIDDEN = 403

const toTab = (value: string | null): TabValue =>
  TABS.find((tab) => tab.value === value)?.value ?? 'schedule'

export const ManagePage = ({ slug }: ManagePageProps) => {
  const session = useRequireSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, error, run } = useManagedBusiness(slug, session.status === 'signedIn')
  const tab = toTab(searchParams.get('tab'))

  const handleTabChange = (value: unknown) =>
    router.replace(`${pathname}?tab=${toTab(String(value))}`, { scroll: false })

  if (error) {
    return (
      <main className={styles.page}>
        <Container className={styles.content}>
          <PageTitle
            title={error.status === FORBIDDEN ? 'Нет доступа.' : 'Не получилось.'}
            subtitle={
              error.status === FORBIDDEN ? 'Этот бизнес управляет другой аккаунт.' : error.message
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
        {!data && <Skeleton className={styles.skeleton} />}

        {data && (
          <>
            <div className={styles.header}>
              <PageTitle
                title={`${data.business.name}.`}
                subtitle={data.business.isPublished ? 'Кабинет' : 'Кабинет · страница скрыта'}
              />
              <ButtonLink
                variant='secondary'
                size='sm'
                render={<NextLink href={`/${data.business.slug}`} target='_blank' />}
              >
                Открыть страницу
              </ButtonLink>
            </div>

            <SetupChecklist business={data.business} catalog={data.catalog} />

            <Tabs value={tab} onValueChange={handleTabChange}>
              <div className={styles.tabsScroller}>
                <TabsList className={styles.tabs}>
                  {TABS.map((item) => (
                    <TabsTab key={item.value} value={item.value}>
                      {item.label}
                    </TabsTab>
                  ))}
                </TabsList>
              </div>
              <TabsPanel value='schedule' className={styles.panel}>
                <ScheduleTab slug={slug} />
              </TabsPanel>
              <TabsPanel value='services' className={styles.panel}>
                <ServicesTab slug={slug} catalog={data.catalog} run={run} />
              </TabsPanel>
              <TabsPanel value='masters' className={styles.panel}>
                <MastersTab slug={slug} catalog={data.catalog} run={run} />
              </TabsPanel>
              <TabsPanel value='hours' className={styles.panel}>
                <HoursTab
                  key={JSON.stringify(data.business.hours)}
                  slug={slug}
                  business={data.business}
                  run={run}
                />
              </TabsPanel>
              <TabsPanel value='profile' className={styles.panel}>
                <ProfileTab slug={slug} business={data.business} run={run} />
              </TabsPanel>
            </Tabs>
          </>
        )}
      </Container>
    </main>
  )
}
