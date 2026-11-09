import type { Business } from '@/shared/api/types'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
import styles from './HomeShelves.module.css'

interface WorkShelfProps {
  business: Business
}

export const WorkShelf = ({ business }: WorkShelfProps) => {
  if (business.photos.length === 0) return null

  return (
    <StoreShelf
      id='work'
      title='Работы.'
      subtitle='Посмотрите, как здесь стригут, красят и ухаживают.'
      label='Фото работ'
      size='sm'
    >
      {business.photos.map((url, index) => (
        <li key={url}>
          <figure className={styles.photo}>
            {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
            <img
              src={url}
              alt={`${business.name}, фото ${index + 1}`}
              loading='lazy'
              decoding='async'
              className={styles.photoImage}
            />
          </figure>
        </li>
      ))}
    </StoreShelf>
  )
}
