import { Tag } from '@phosphor-icons/react/ssr'
import type { PublicPromotion } from '@/shared/api/types'
import { describePromotion } from '@/shared/lib/promotionText'
import styles from './Place.module.css'

interface PromotionsStripProps {
  promotions: PublicPromotion[]
}

// Open promotions under the place card: one short line each; booking applies them by itself.
export const PromotionsStrip = ({ promotions }: PromotionsStripProps) => {
  if (promotions.length === 0) return null

  return (
    <section className={styles.promotions} aria-label='Акции'>
      {promotions.map((promotion) => (
        <p key={promotion.id} className={styles.promotion}>
          <Tag weight='fill' aria-hidden />
          <span className={styles.promotionTitle}>{promotion.title}</span>
          <span className={styles.promotionText}>{describePromotion(promotion)}</span>
        </p>
      ))}
    </section>
  )
}
