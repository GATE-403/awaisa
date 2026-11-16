import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listLeaderboard, listPlacesLeaderboard } from '@/shared/api/serverApi'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { LeaderboardPage, LeaderboardSkeleton } from '@/views/leaderboard'

export const metadata: Metadata = {
  title: 'Рейтинг мастеров и мест',
  description: 'Лучшие барберы и мастера Бишкека по отзывам клиентов — и запись к ним онлайн.',
}

// The board for the kind in the URL (barbers by default), from the server cache.
const LeaderboardWithData = async ({
  kindParam,
  viewParam,
}: {
  kindParam: unknown
  viewParam: unknown
}) => {
  const kind = BUSINESS_KINDS.find((item) => item.value === kindParam)?.value ?? 'barber'
  const view = viewParam === 'places' ? 'places' : 'masters'
  const [masters, places] = await Promise.all([
    view === 'masters' ? listLeaderboard(kind).catch(() => []) : Promise.resolve([]),
    view === 'places' ? listPlacesLeaderboard(kind).catch(() => []) : Promise.resolve([]),
  ])

  return <LeaderboardPage kind={kind} view={view} masters={masters} places={places} />
}

const TopRoute = ({ searchParams }: PageProps<'/top'>) => (
  <Suspense fallback={<LeaderboardSkeleton />}>
    {searchParams.then((query) => (
      <LeaderboardWithData kindParam={query.kind} viewParam={query.view} />
    ))}
  </Suspense>
)

export default TopRoute
