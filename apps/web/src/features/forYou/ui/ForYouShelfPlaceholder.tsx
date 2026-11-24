import type { ReactNode } from 'react'
import { T } from '@/shared/i18n'
import { Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import storyStyles from '@/shared/ui/StoryTile/StoryTile.module.css'
import styles from './ForYou.module.css'

interface ForYouShelfPlaceholderProps {
  title?: string
  headAction?: ReactNode
  variant?: 'cards' | 'stories'
}

// The shelf before its picks arrive: the same head and its frames with the mascot (3:4 cards, or
// the stories row), so the page under it stays put. Also the catalog's loading skeleton.
export const ForYouShelfPlaceholder = ({
  title = 'For you',
  headAction,
  variant = 'cards',
}: ForYouShelfPlaceholderProps) => (
  // Not a named region: tests and screen readers find the real shelf «For you», not this stand-in.
  <div className={styles.shelf} aria-busy='true'>
    <div className={styles.head}>
      <p className={styles.title}>
        <T>{title}</T>
      </p>
      {headAction}
    </div>
    {variant === 'stories' ? (
      // The stories row from the tile's own classes: the 92pt frame and its two lines, so the
      // row keeps its size when the picks arrive (a lone square with a guessed margin did not).
      <ul className={storyStyles.row} aria-hidden='true'>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <li key={index} className={storyStyles.item}>
            <span className={storyStyles.tile}>
              <Picture className={storyStyles.frame} />
              <span className={storyStyles.label}>
                <TextLine chars={11} />
              </span>
              <span className={storyStyles.note}>
                <TextLine chars={9} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <ul className={styles.track} aria-hidden='true'>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <li key={index}>
            <Picture className={styles.placeholderCard} />
          </li>
        ))}
      </ul>
    )}
  </div>
)
