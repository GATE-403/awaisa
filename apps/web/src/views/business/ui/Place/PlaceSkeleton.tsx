import { PlaceLine, PlaceName, PlaceProfile } from '@/entities/business'
import { Block, Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import styles from './Place.module.css'
import skeleton from './PlaceSkeleton.module.css'

const CARDS = 4

// A place while it streams in, on the page's own parts: the cover with the mascot, the logo on
// its edge with «Записаться» and the glyph capsule, the bio, then the tabs and the «Услуги» tab's
// chips and cards. Nothing moves when the place arrives.
export const PlaceSkeleton = () => (
  <main
    className={styles.shell}
    data-page-skeleton=''
    aria-busy='true'
    aria-label='Загружаем страницу места'
  >
    <div className={styles.page}>
      <PlaceProfile
        name=''
        hasCover={false}
        cover={<Picture className={skeleton.cover} />}
        logo={<Block className={skeleton.logo} />}
        actions={
          <>
            <Block className={skeleton.book} />
            <Block className={skeleton.glyphs} />
          </>
        }
      >
        <PlaceName as='p'>
          <TextLine chars={14} />
        </PlaceName>
        <PlaceLine>
          <TextLine chars={30} />
        </PlaceLine>
        <PlaceLine>
          <TextLine chars={18} />
        </PlaceLine>
        <PlaceLine>
          <TextLine chars={16} />
        </PlaceLine>
      </PlaceProfile>
      <p className={skeleton.tabs}>
        <TextLine chars={8} />
        <TextLine chars={8} />
        <TextLine chars={10} />
        <TextLine chars={5} />
      </p>
      <div className={styles.menu}>
        <p className={skeleton.chips}>
          <Block className={skeleton.chip} />
          <Block className={skeleton.chip} />
          <Block className={skeleton.chip} />
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
    </div>
  </main>
)
