import { Block, Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import styles from './Place.module.css'
import skeleton from './PlaceSkeleton.module.css'

const CARDS = 4

// A place while it streams in, on the page's own classes: the cover with the mascot, the round
// logo on its edge with the action capsules, name, handle, facts, then «Услуги и цены» with its
// category tabs and cards — and the aside's cards from 1024px. Nothing moves when the place arrives.
export const PlaceSkeleton = () => (
  <main
    className={styles.shell}
    data-page-skeleton=''
    aria-busy='true'
    aria-label='Загружаем страницу места'
  >
    <header className={styles.header}>
      <Picture className={styles.cover} />
      <div className={styles.headerBody}>
        <div className={styles.topRow}>
          <Block className={`${styles.tile} ${skeleton.logo}`} />
          <div className={styles.actions}>
            <Block className={skeleton.quickActions} />
            <Block className={skeleton.book} />
          </div>
        </div>
        <div className={styles.identityText}>
          <p className={styles.name}>
            <TextLine chars={14} />
          </p>
          <p className={styles.handle}>
            <TextLine chars={30} />
          </p>
          <p className={styles.stats}>
            <TextLine chars={26} />
          </p>
          <p className={styles.where}>
            <TextLine chars={20} />
          </p>
        </div>
        <p className={styles.description}>
          <TextLine chars={44} />
        </p>
      </div>
    </header>
    <div className={styles.page}>
      <div className={styles.body}>
        <div className={styles.main}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <p className={styles.sectionTitle}>Услуги и цены</p>
            </div>
            <p className={skeleton.tabs}>
              <TextLine chars={5} />
              <TextLine chars={8} />
              <TextLine chars={11} />
              <TextLine chars={7} />
            </p>
            <div className={styles.group}>
              <p className={styles.groupTitle}>
                <TextLine chars={14} />
              </p>
              <ul className={styles.serviceGrid} aria-hidden='true'>
                {Array.from({ length: CARDS }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
                  <li key={index}>
                    <Picture className={skeleton.card} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
        <div className={`${styles.aside} ${skeleton.aside}`}>
          <Block className={skeleton.nextSlot} />
          <Block className={skeleton.visit} />
        </div>
      </div>
    </div>
  </main>
)
