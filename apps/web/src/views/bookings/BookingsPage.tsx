'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { FavoritesShelf, useFavorites } from '@/features/favorites'
import { ForYouShelf } from '@/features/forYou'
import { WaitlistList } from '@/features/waitlist'
import type { Booking } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { pluralWord } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { useMyBookings } from '@/views/bookings/model/useMyBookings'
import { BookingHistory } from '@/views/bookings/ui/BookingHistory/BookingHistory'
import { UpcomingBooking } from '@/views/bookings/ui/UpcomingBooking/UpcomingBooking'
import styles from './BookingsPage.module.css'
import { getCountdown, isUpcoming } from './bookingsUtils'
import { AccountCard } from './ui/AccountCard/AccountCard'
import { AccountSettings } from './ui/AccountSettings/AccountSettings'
import { LoyaltyCard } from './ui/LoyaltyCard/LoyaltyCard'

// The nearest visits first; the rest behind «Ещё N записей», so the page does not run long.
const UPCOMING_FIRST = 3

interface BookingsPageProps {
  /** The signed-in account's bookings, read on the server for this request. */
  initialAccountBookings?: Booking[] | null
}

export const BookingsPage = ({ initialAccountBookings = null }: BookingsPageProps) => {
  const today = useToday()
  const { bookings, isReady, canForget, cancellingId, cancel, replace, forget } =
    useMyBookings(initialAccountBookings)
  const router = useRouter()
  const [tab, setTab] = useState<'upcoming' | 'history' | 'favorites' | 'settings' | null>(null)
  const { ids: favoriteIds } = useFavorites()
  const isSignedIn = useSession().status === 'signedIn'
  const [isAllUpcoming, setIsAllUpcoming] = useState(false)
  const toast = useToast()
  const upcoming = bookings
    .filter((booking) => isUpcoming(booking, today))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt))
  const history = bookings.filter((booking) => !isUpcoming(booking, today))

  // Back from the deposit checkout (`?paid=<booking>`): say it worked, once. Read from the URL in
  // an effect — this page is also the prerendered shell, where search params do not exist.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on arrival
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('paid')) return
    toast.show({
      title: 'Предоплата внесена',
      description: 'Вы записаны — ждём вас',
      type: 'success',
    })
    router.replace('/bookings', { scroll: false })
  }, [])

  const visits = history.filter((booking) => booking.status === 'confirmed').length
  const view = tab ?? (upcoming.length === 0 && history.length > 0 ? 'history' : 'upcoming')

  return (
    <main className={styles.page}>
      <Container size='md' className={styles.content}>
        <AccountCard bookings={bookings} visits={visits} />

        {!isReady && <Skeleton className={styles.skeleton} />}

        {isReady && (
          <div className={styles.feed}>
            {/* The whole profile in four tabs: what is ahead, what has been, what was saved, and
                the account's settings — one place to look, no long page to scroll. */}
            <TextTabs
              label='Профиль'
              items={[
                {
                  label: 'Предстоящие',
                  count: upcoming.length,
                  isActive: view === 'upcoming',
                  onSelect: () => setTab('upcoming'),
                  id: 'tab-upcoming',
                  controls: 'panel-upcoming',
                },
                {
                  label: 'История',
                  count: history.length,
                  isActive: view === 'history',
                  onSelect: () => setTab('history'),
                  id: 'tab-history',
                  controls: 'panel-history',
                },
                {
                  label: 'Избранное',
                  count: favoriteIds.length || undefined,
                  isActive: view === 'favorites',
                  onSelect: () => setTab('favorites'),
                  id: 'tab-favorites',
                  controls: 'panel-favorites',
                },
                ...(isSignedIn
                  ? [
                      {
                        label: 'Настройки',
                        isActive: view === 'settings',
                        onSelect: () => setTab('settings'),
                        id: 'tab-settings',
                        controls: 'panel-settings',
                      },
                    ]
                  : []),
              ]}
            />

            {view === 'upcoming' && (
              <div
                className={styles.panel}
                role='tabpanel'
                id='panel-upcoming'
                aria-labelledby='tab-upcoming'
              >
                {bookings.length === 0 ? (
                  <div className={styles.empty}>
                    <Mascot className={styles.mascot} />
                    <p className={styles.emptyTitle}>Запишитесь к мастеру</p>
                    <p className={styles.emptyText}>
                      Найдите салон и выберите время — запись появится здесь
                    </p>
                    <ButtonLink render={<NextLink href='/' />} size='lg'>
                      Найти, куда записаться
                    </ButtonLink>
                  </div>
                ) : upcoming.length > 0 ? (
                  <MoreFade
                    hiddenCount={Math.max(0, upcoming.length - UPCOMING_FIRST)}
                    isOpen={isAllUpcoming}
                    onToggle={() => setIsAllUpcoming((value) => !value)}
                    label={pluralWord(upcoming.length - UPCOMING_FIRST, [
                      'запись',
                      'записи',
                      'записей',
                    ])}
                    surface='card'
                  >
                    <div className={styles.upcoming}>
                      {(isAllUpcoming ? upcoming : upcoming.slice(0, UPCOMING_FIRST)).map(
                        (booking) => (
                          <UpcomingBooking
                            key={booking.id}
                            booking={booking}
                            countdown={getCountdown(booking, today)}
                            isCancelling={cancellingId === booking.id}
                            onCancel={() => cancel(booking.id)}
                            onMoved={replace}
                          />
                        ),
                      )}
                    </div>
                  </MoreFade>
                ) : (
                  <p className={styles.panelEmpty}>
                    Впереди ничего нет. <NextLink href='/'>Найти, куда записаться ›</NextLink>
                  </p>
                )}
                {/* Nothing ahead: what to book next, picked for this person — here it is useful,
                    not at the foot of the profile. */}
                {upcoming.length === 0 && <ForYouShelf title='Куда записаться' />}
                <WaitlistList />
                <LoyaltyCard />
              </div>
            )}
            {view === 'history' && (
              <div
                className={styles.panel}
                role='tabpanel'
                id='panel-history'
                aria-labelledby='tab-history'
              >
                {history.length > 0 ? (
                  <BookingHistory bookings={history} canForget={canForget} onForget={forget} />
                ) : (
                  <p className={styles.panelEmpty}>Здесь появятся прошедшие визиты.</p>
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
              <div
                className={styles.panel}
                role='tabpanel'
                id='panel-settings'
                aria-labelledby='tab-settings'
              >
                <AccountSettings isTitleHidden />
              </div>
            )}
          </div>
        )}
      </Container>
    </main>
  )
}
