'use client'

import { Plus } from '@phosphor-icons/react/ssr'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './PageTab.module.css'

interface PageChecklistProps {
  business: Business
  /** Work photos on the page; null while they load. */
  photoCount: number | null
  onAddCover: () => void
  onAddLogo: () => void
  onAddPhotos: () => void
}

/** Places with this many photos of work show a full first row on the page. */
const PHOTOS_WANTED = 3

// What the page still lacks, while it lacks anything: «+ Обложка · + 3 фото работ · + Логотип»; «Добавить пару слов о себе» already sits in the bio right above, each capsule doing its own. Gone once complete.
export const PageChecklist = ({
  business,
  photoCount,
  onAddCover,
  onAddLogo,
  onAddPhotos,
}: PageChecklistProps) => {
  const t = useT()
  if (photoCount === null) return null
  const photosMissing = Math.max(0, PHOTOS_WANTED - photoCount)
  const missing = [
    !business.coverUrl && {
      chip: t('Обложка'),
      action: onAddCover,
    },
    photosMissing > 0 && {
      chip: t.count(photosMissing, ['фото работы', 'фото работ', 'фото работ']),
      action: onAddPhotos,
    },
    !business.logoUrl && { chip: t('Логотип'), action: onAddLogo },
  ].filter((item) => item !== false)
  if (missing.length === 0) return null
  // One row of small capsules, one per thing missing, like «+ Акция» beside it: a sentence with
  // its action wrapped onto a second line read as a wall of grey («как сделать дизайн лучше»).
  return (
    <ul className={styles.promotions} aria-label={t('Добавьте на страницу')}>
      {missing.map((item) => (
        <li key={item.chip}>
          <button type='button' className={styles.promotion} data-add onClick={item.action}>
            <Plus weight='bold' aria-hidden />
            {item.chip}
          </button>
        </li>
      ))}
    </ul>
  )
}
