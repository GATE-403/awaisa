import type { BusinessKind, LeaderboardMaster, LeaderboardPlace } from '@/shared/api/types'
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs'
import type { BoardView } from './config/boards'
import styles from './LeaderboardPage.module.css'
import { LeaderboardBoard } from './ui/LeaderboardBoard'

interface LeaderboardPageProps {
  kind: BusinessKind
  view: BoardView
  masters: LeaderboardMaster[]
  places: LeaderboardPlace[]
}

// The leaderboard in the app's quiet style: masters or places of one kind in one thread of rows,
// every row the same, the top three told by the colour of their place.
// Ranked by reviews, the average pulled toward 4.3 until there are enough of them.
// The trail stays on the server (its schema.org markup is Russian); the board is translated.
export const LeaderboardPage = ({ kind, view, masters, places }: LeaderboardPageProps) => (
  <main className={styles.page}>
    <div className={styles.column}>
      <Breadcrumbs
        align='center'
        className={styles.crumbs}
        items={[
          { label: 'Catalogue', href: '/' },
          { label: 'Rating', href: `/top?kind=${kind}${view === 'places' ? '&view=places' : ''}` },
        ]}
      />
      <LeaderboardBoard kind={kind} view={view} masters={masters} places={places} />
    </div>
  </main>
)
