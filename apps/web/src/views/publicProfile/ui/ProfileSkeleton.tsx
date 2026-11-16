import type { CSSProperties } from 'react'
import { AchievementsPlaceholder } from '@/entities/profile'
import { Block, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import styles from '../ProfilePage.module.css'
import skeleton from './ProfileSkeleton.module.css'

// A profile while it streams in, on the page's own classes: a neutral wash (the colour is the
// person's, not known yet), the face, name, status, the facts and level lines, two small
// capsules, then «Достижения» with grey medals.
export const ProfileSkeleton = () => (
  <main
    className={styles.page}
    style={{ '--accent': 'var(--color-muted-foreground)' } as CSSProperties}
    data-page-skeleton=''
    aria-busy='true'
    aria-label='Загружаем профиль'
  >
    <div className={styles.column}>
      <p className={`${styles.crumbs} ${skeleton.crumbs}`}>
        <TextLine chars={16} />
      </p>
      <header className={styles.head}>
        <Block className={skeleton.face} />
        <p className={styles.name}>
          <TextLine chars={10} />
        </p>
        <p className={styles.status}>
          <TextLine chars={18} />
        </p>
        <p className={styles.facts}>
          <TextLine chars={20} />
        </p>
        <p className={styles.level}>
          <TextLine chars={34} />
        </p>
        <div className={styles.actions}>
          <Block className={skeleton.action} />
          <Block className={skeleton.action} />
        </div>
      </header>
      <section className={styles.section}>
        <p className={styles.caption}>Достижения</p>
        <AchievementsPlaceholder />
      </section>
    </div>
  </main>
)
