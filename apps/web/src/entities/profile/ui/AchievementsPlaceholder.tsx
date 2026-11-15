import { Block, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import styles from './Achievements.module.css'

// The medals while the profile loads: grey discs with a title and a line under each, in the
// same grid (3 a row, 5 from 768px).
export const AchievementsPlaceholder = ({ count = 6 }: { count?: number }) => (
  <ul className={styles.grid} aria-hidden='true'>
    {Array.from({ length: count }, (_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
      <li key={index} className={styles.item}>
        <Block className={styles.medal} />
        <span className={styles.title}>
          <TextLine chars={10} />
        </span>
        <span className={styles.description}>
          <TextLine chars={14} />
        </span>
      </li>
    ))}
  </ul>
)
