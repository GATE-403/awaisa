import { Block, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import tabs from '@/shared/ui/TextTabs/TextTabs.module.css'
import styles from '../LeaderboardPage.module.css'
import skeleton from './LeaderboardSkeleton.module.css'

const ROWS = 8

// The board while it streams in, on the page's own classes: the gold wash, the trail, the title
// still to come over «По отзывам клиентов», the switch and kind tabs, then rows of one height —
// the place, a face, a name over a place, the rating on the right.
export const LeaderboardSkeleton = () => (
  <main
    className={styles.page}
    data-page-skeleton=''
    aria-busy='true'
    aria-label='Загружаем рейтинг'
  >
    <div className={styles.column}>
      <p className={`${styles.crumbs} ${skeleton.crumbs}`}>
        <TextLine chars={16} />
      </p>
      <header className={styles.head}>
        <p className={styles.title}>
          <TextLine chars={14} />
        </p>
        <p className={styles.lead}>По отзывам клиентов в Awaisa</p>
      </header>
      <div className={styles.controls}>
        <Block className={skeleton.switch} />
        <div className={`${styles.kinds} ${skeleton.kinds}`}>
          {[7, 6, 8, 6, 7].map((chars, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
            <span key={index} className={tabs.tab}>
              <TextLine chars={chars} />
            </span>
          ))}
        </div>
      </div>
      <ol className={styles.list} aria-hidden='true'>
        {Array.from({ length: ROWS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
          <li key={index}>
            <span className={styles.row}>
              <span className={styles.place}>{index + 1}</span>
              <Block className={skeleton.face} />
              <span className={styles.who}>
                <span className={styles.name}>
                  <TextLine chars={12} />
                </span>
                <span className={styles.where}>
                  <TextLine chars={16} />
                </span>
              </span>
              <span className={styles.rating}>
                <span className={styles.ratingValue}>
                  <TextLine chars={5} />
                </span>
                <span className={styles.muted}>
                  <TextLine chars={9} />
                </span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  </main>
)
