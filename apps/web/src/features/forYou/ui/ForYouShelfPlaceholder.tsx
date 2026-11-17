import type { ReactNode } from 'react'
import { Picture } from '@/shared/ui/Placeholder/Placeholder'
import styles from './ForYou.module.css'

interface ForYouShelfPlaceholderProps {
  title?: string
  headAction?: ReactNode
  variant?: 'cards' | 'stories'
}

// The shelf before its picks arrive: the same head and four 3:4 frames with the mascot, so the
// page under it stays put. Also the catalog's loading skeleton.
export const ForYouShelfPlaceholder = ({
  title = 'Для вас',
  headAction,
  variant = 'cards',
}: ForYouShelfPlaceholderProps) => (
  // Not a named region: tests and screen readers find the real shelf «Для вас», not this stand-in.
  <div className={styles.shelf} aria-busy='true'>
    <div className={styles.head}>
      <p className={styles.title}>{title}</p>
      {headAction}
    </div>
    <ul
      className={styles.track}
      data-stories={variant === 'stories' || undefined}
      aria-hidden='true'
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <li key={index}>
          <Picture
            className={variant === 'stories' ? styles.placeholderStory : styles.placeholderCard}
          />
        </li>
      ))}
    </ul>
  </div>
)
