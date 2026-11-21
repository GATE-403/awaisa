import { T } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import { Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import tabs from '@/shared/ui/TextTabs/TextTabs.module.css'
import styles from '../ServicesPage.module.css'
import nav from './CategoryNav.module.css'

const CARDS = 6

// The menu while it streams in, on the page's own classes: «Услуги и цены» with the place's name
// still to come, the facts line, the category tabs and one group of 3:4 service cards.
export const ServicesSkeleton = () => (
  <main
    className={styles.page}
    data-page-skeleton=''
    aria-busy='true'
    aria-label='Загружаем услуги'
  >
    <Container className={styles.hero}>
      <p className={styles.title}>
        <T>Услуги и цены</T>{' '}
        <span className={styles.titleMuted}>
          <TextLine chars={7} />
        </span>
      </p>
      <p className={styles.facts}>
        <TextLine chars={9} />
        <TextLine chars={12} />
        <TextLine chars={10} />
      </p>
    </Container>
    <div className={nav.bar} aria-hidden='true'>
      <Container className={`${tabs.list} ${nav.list}`}>
        {[8, 11, 6, 9].map((chars) => (
          <span key={chars} className={tabs.tab}>
            <TextLine chars={chars} />
          </span>
        ))}
      </Container>
    </div>
    <Container className={styles.groups}>
      <section>
        <p className={styles.groupTitle}>
          <TextLine chars={10} />
        </p>
        <ul className={styles.cards} aria-hidden='true'>
          {Array.from({ length: CARDS }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
            <li key={index}>
              <Picture className={styles.placeholderCard} />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  </main>
)
