'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { CaretLeft } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { FavoritesShelf, useFavorites } from '@/features/favorites'
import { ForYouShelf } from '@/features/forYou'
import { RateRecent } from '@/features/rateVisit'
import { WaitlistList } from '@/features/waitlist'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useMyBookings } from '@/views/bookings/model/useMyBookings'
import { BookingHistory } from '@/views/bookings/ui/BookingHistory/BookingHistory'
import { UpcomingBooking } from '@/views/bookings/ui/UpcomingBooking/UpcomingBooking'
import styles from './BookingsPage.module.css'
import { getCountdown, isUpcoming } from './bookingsUtils'
import { AccountCard } from './ui/AccountCard/AccountCard'
import { AccountSettings } from './ui/AccountSettings/AccountSettings'
import { LoyaltyCard } from './ui/LoyaltyCard/LoyaltyCard'

// After the nearest visit, the next few as rows; the rest behind «Ещё N записей».
const LATER_FIRST = 3

interface BookingsPageProps {
  /** The signed-in account's bookings, read on the server for this request. */
  initialAccountBookings?: Booking[] | null
}

const PROFILE_TABS = ['bookings', 'favorites', 'settings'] as const
type ProfileTab = (typeof PROFILE_TABS)[number]

/** Old links to the two tabs the records were split into land on the one «Записи». */
const OLD_TABS: Record<string, ProfileTab> = { upcoming: 'bookings', history: 'bookings' }

export const BookingsPage = ({ initialAccountBookings = null }: BookingsPageProps) => {
  const t = useT()
  const today = useToday()
  const { bookings, isReady, canForget, cancellingId, cancel, replace, forget } =
    useMyBookings(initialAccountBookings)
  const router = useRouter()
  // The open tab lives in the URL (`?tab=history`), so a reload or a shared link keeps it. Read
  // from `location` after mount: this page is also the static shell's fallback, where search
  // params cannot be read during prerendering.
  const [tab, setTabState] = useState<ProfileTab | null>(null)
  const setTab = (next: ProfileTab) => {
    setTabState(next)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', url)
  }
  const { ids: favoriteIds } = useFavorites()
  const sessionStatus = useSession().status
  const isSignedIn = sessionStatus === 'signedIn'
  const [isAllUpcoming, setIsAllUpcoming] = useState(false)
  const toast = useToast()
  const upcoming = bookings
    .filter((booking) => isUpcoming(booking, today))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
  const history = bookings.filter((booking) => !isUpcoming(booking, today))

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab') ?? ''
    const known = PROFILE_TABS.find((item) => item === fromUrl) ?? OLD_TABS[fromUrl]
    if (known) setTabState(known)
  }, [])

  // Back from the deposit checkout (`?paid=<booking>`): say it worked, once. Read from the URL in
  // an effect — this page is also the prerendered shell, where search params do not exist.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on arrival
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('paid')) return
    toast.show({
      title: t('Предоплата внесена'),
      description: t('Вы записаны — ждём вас'),
      type: 'success',
    })
    router.replace('/bookings', { scroll: false })
  }, [])

  const visits = history.filter((booking) => booking.status === 'confirmed').length
  // A guest has no settings: a «?tab=settings» link shows their records instead of an empty
  // screen under a «‹ Записи · Настройки» bar.
  const isGuest = sessionStatus === 'guest'
  const view = tab === 'settings' && isGuest ? 'bookings' : (tab ?? 'bookings')
  const [next, ...later] = upcoming

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <AccountCard
          bookings={bookings}
          visits={visits}
          onOpenSettings={isSignedIn && view !== 'settings' ? () => setTab('settings') : undefined}
        />

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && (
          <div className={styles.feed}>
            {/* Two tabs: the records (what is ahead, then what has been) and what was saved; the
                settings open from the account's gear as a screen of their own. */}
            {view !== 'settings' && (
              <TextTabs
                label={t('Профиль')}
                items={[
                  {
                    label: t('Записи'),
                    count: upcoming.length || undefined,
                    isActive: view === 'bookings',
                    onSelect: () => setTab('bookings'),
                    id: 'tab-bookings',
                    controls: 'panel-bookings',
                  },
                  {
                    label: t('Избранное'),
                    count: favoriteIds.length || undefined,
                    isActive: view === 'favorites',
                    onSelect: () => setTab('favorites'),
                    id: 'tab-favorites',
                    controls: 'panel-favorites',
                  },
                ]}
              />
            )}

            {view === 'bookings' && (
              <div
                className={styles.panel}
                role='tabpanel'
                id='panel-bookings'
                aria-labelledby='tab-bookings'
              >
                {/* The page answers «when and where do I go» first: the nearest visit, large. */}
                {bookings.length === 0 ? (
                  <EmptyState
                    title={t('Запишитесь к мастеру')}
                    text={t('Найдите салон и выберите время — запись появится здесь')}
                    action={
                      <ButtonLink render={<NextLink href='/' />} size='lg'>
                        {t('Найти, куда записаться')}
                      </ButtonLink>
                    }
                  />
                ) : next ? (
                  <section className={styles.next} aria-label={t('Ближайший визит')}>
                    <UpcomingBooking
                      booking={next}
                      countdown={getCountdown(next, today, t)}
                      isCancelling={cancellingId === next.id}
                      onCancel={() => cancel(next.id)}
                      onMoved={replace}
                    />
                  </section>
                ) : (
                  <p className={styles.panelEmpty}>
                    {t('Впереди ничего нет.')}{' '}
                    <NextLink href='/'>{t('Найти, куда записаться ›')}</NextLink>
                  </p>
                )}

                {/* The later visits: one quiet row each, every action behind «⋯». */}
                {later.length > 0 && (
                  <section className={styles.section} aria-labelledby='later-title'>
                    <SectionCaption as='h2' id='later-title' isInset={false}>
                      {t('Дальше')}
                    </SectionCaption>
                    <MoreFade
                      hiddenCount={Math.max(0, later.length - LATER_FIRST)}
                      isOpen={isAllUpcoming}
                      onToggle={() => setIsAllUpcoming((value) => !value)}
                      label={t
                        .count(later.length - LATER_FIRST, ['запись', 'записи', 'записей'])
                        .replace(/^\d+ /, '')}
                      surface='card'
                    >
                      <div className={styles.upcoming}>
                        {(isAllUpcoming ? later : later.slice(0, LATER_FIRST)).map((booking) => (
                          <UpcomingBooking
                            key={booking.id}
                            booking={booking}
                            variant='row'
                            countdown={getCountdown(booking, today, t)}
                            isCancelling={cancellingId === booking.id}
                            onCancel={() => cancel(booking.id)}
                            onMoved={replace}
                          />
                        ))}
                      </div>
                    </MoreFade>
                  </section>
                )}

                {/* Nothing ahead: what to book next, picked for this person. */}
                {bookings.length > 0 && !next && (
                  <ForYouShelf title={t('Куда записаться')} surface='profile' />
                )}
                <WaitlistList />
                <LoyaltyCard />

                {/* What has been, under what is ahead: the last visit asks how it went, the
                    services due again come one tap from booking, then the visits themselves. */}
                {history.length > 0 && (
                  <section className={styles.section} aria-labelledby='past-title'>
                    <SectionCaption as='h2' id='past-title' isInset={false}>
                      {t('Прошлые')}
                      <span className={styles.captionCount}>{history.length}</span>
                    </SectionCaption>
                    <RateRecent history={history} today={today} onRated={replace} />
                    <ForYouShelf title={t('Пора снова')} surface='due' isOnlyDue />
                    <BookingHistory
                      bookings={history}
                      canForget={canForget}
                      onForget={forget}
                      onRated={replace}
                    />
                  </section>
                )}
              </div>
            )}
            {view === 'favorites' && (
              <div
                className={styles.panel}
                role='tabpanel'
                id='panel-favorites'
                aria-labelledby='tab-favorites'
              >
                <FavoritesShelf layout='grid' />
              </div>
            )}
            {view === 'settings' && (
              <section
                className={styles.panel}
                id='panel-settings'
                aria-labelledby='settings-title'
              >
                {/* Back to the records, the way an iOS settings screen leads back. */}
                <div className={styles.settingsBar}>
                  <button
                    type='button'
                    className={styles.backLink}
                    onClick={() => setTab('bookings')}
                  >
                    <CaretLeft aria-hidden />
                    {t('Записи')}
                  </button>
                  <h2 id='settings-title' className={styles.settingsTitle}>
                    {t('Настройки')}
                  </h2>
                </div>
                <AccountSettings isTitleHidden />
              </section>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}
