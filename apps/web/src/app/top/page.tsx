import type { Metadata } from 'next'
import { Suspense } from 'react'
import { listLeaderboard, listPlacesLeaderboard } from '@/shared/api/serverApi'
import { boardMetadata, LeaderboardPage, LeaderboardSkeleton, readBoard } from '@/views/leaderboard'

export const generateMetadata = async ({ searchParams }: PageProps<'/top'>): Promise<Metadata> =>
  boardMetadata(await searchParams)

// The board for the kind in the URL (barbers by default), from the server cache.
const LeaderboardWithData = async ({
  query,
}: {
  query: Record<string, string | string[] | undefined>
}) => {
  const { kind, view } = readBoard(query)
  const [masters, places] = await Promise.all([
    view === 'masters' ? listLeaderboard(kind).catch(() => []) : Promise.resolve([]),
    view === 'places' ? listPlacesLeaderboard(kind).catch(() => []) : Promise.resolve([]),
  ])

  return <LeaderboardPage kind={kind} view={view} masters={masters} places={places} />
}

const TopRoute = ({ searchParams }: PageProps<'/top'>) => (
  <Suspense fallback={<LeaderboardSkeleton />}>
    {searchParams.then((query) => (
      <LeaderboardWithData query={query} />
    ))}
  </Suspense>
)

export default TopRoute
