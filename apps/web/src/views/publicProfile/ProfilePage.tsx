import { profileStyle } from '@/entities/profile'
import type { PublicProfile } from '@/shared/api/types'
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs'
import styles from './ProfilePage.module.css'
import { ProfileContent } from './ui/ProfileContent'

interface ProfilePageProps {
  profile: PublicProfile
}

// A client's page in the app's own voice, like a contact card in iOS: the face centred on a soft
// wash of their colour, name and status, one line of facts, the level as a line of text; then
// achievements as medals and short rows of masters, places and reviews — on the page, no cards.
// The trail stays on the server (its schema.org markup is Russian); the rest is translated.
export const ProfilePage = ({ profile }: ProfilePageProps) => (
  <main className={styles.page} style={profileStyle(profile.accent)}>
    <div className={styles.column}>
      <Breadcrumbs
        className={styles.crumbs}
        items={[
          { label: 'Каталог', href: '/' },
          { label: profile.name, href: `/u/${profile.handle ?? profile.id}` },
        ]}
      />
      <ProfileContent profile={profile} />
    </div>
  </main>
)
