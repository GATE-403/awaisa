import type { Business } from '@/shared/api/types'
import styles from './Place.module.css'

interface PhotosSectionProps {
  business: Business
}

// A mosaic: the first photo large, the rest beside it — the work speaks before the copy.
export const PhotosSection = ({ business }: PhotosSectionProps) => {
  if (business.photos.length === 0) return null

  return (
    <section id='work' className={styles.section} aria-labelledby='place-work'>
      <div className={styles.sectionHead}>
        <h2 id='place-work' className={styles.sectionTitle}>
          Работы
        </h2>
      </div>
      <ul className={styles.photos} data-count={Math.min(business.photos.length, 5)}>
        {business.photos.slice(0, 5).map((url, index) => (
          <li key={url} className={styles.photo}>
            {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
            <img
              src={url}
              alt={`${business.name}, фото ${index + 1}`}
              loading='lazy'
              decoding='async'
              className={styles.photoImage}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
