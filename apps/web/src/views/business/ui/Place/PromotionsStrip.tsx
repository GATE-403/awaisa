import type { PublicPromotion } from '@/shared/api/types'
import { describePromotion } from '@/shared/lib/promotionText'
import styles from './Place.module.css'

interface PromotionsStripProps {
  promotions: PublicPromotion[]
}

// Open promotions under the bio as small red capsules, as the owner's «Page» shows them;
// booking applies them by itself.
export const PromotionsStrip = ({ promotions }: PromotionsStripProps) => {
  if (promotions.length === 0) return null

  return (
    <ul className={styles.promotions} aria-label='Promotions'>
      {promotions.map((promotion) => (
        <li key={promotion.id} className={styles.promotion} title={promotion.title}>
          {describePromotion(promotion)}
        </li>
      ))}
    </ul>
  )
}
