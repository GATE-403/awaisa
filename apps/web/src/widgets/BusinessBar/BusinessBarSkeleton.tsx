import { Block, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import styles from './BusinessBar.module.css'
import skeleton from './BusinessBarSkeleton.module.css'

// The bar's row while the business loads: the same height and material, the tile and name and
// the section tabs as bars - so the page under it starts where it will stay.
export const BusinessBarSkeleton = () => (
  <div className={styles.bar} aria-hidden='true'>
    <div className={styles.inner}>
      <span className={styles.business}>
        <Block className={skeleton.tile} />
        <span className={styles.name}>
          <TextLine chars={10} />
        </span>
      </span>
      <span className={skeleton.sections}>
        <TextLine chars={6} />
        <TextLine chars={14} />
        <TextLine chars={8} />
      </span>
    </div>
  </div>
)
