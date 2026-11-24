'use client'

import { Plus } from '@phosphor-icons/react/ssr'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './PageTab.module.css'

interface PageChecklistProps {
  business: Business
  /** Work photos on the page; null while they load. */
  photoCount: number | null
  onAddLogo: () => void
  onAddPhotos: () => void
  /** «+ О себе»: opens «Редактировать» on the description. */
  onAddBio: () => void
}

/** Places with this many photos of work show a full first row on the page. */
const PHOTOS_WANTED = 3

// What the page still lacks, while it lacks anything: «+ О себе · + 3 фото работ · + Логотип»
// (the cover has its own «Добавить обложку» on it), each capsule doing its own, in one row with the promotions. Gone once complete.
export const PageChecklist = ({
  business,
  photoCount,
  onAddLogo,
  onAddPhotos,
  onAddBio,
}: PageChecklistProps) => {
  const t = useT()
  if (photoCount === null) return null
  const photosMissing = Math.max(0, PHOTOS_WANTED - photoCount)
  const missing = [
    !business.description && { chip: t('About me'), action: onAddBio },
    photosMissing > 0 && {
      chip: t.count(photosMissing, ['work photo', 'work photos']),
      action: onAddPhotos,
    },
    !business.logoUrl && { chip: t('Logo'), action: onAddLogo },
  ].filter((item) => item !== false)
  if (missing.length === 0) return null
  // One row of small capsules, one per thing missing, like «+ Акция» beside it: a sentence with
  // its action wrapped onto a second line read as a wall of grey («как сделать дизайн лучше»).
  return (
    <ul className={styles.promotions} data-checklist aria-label={t('Add to your page')}>
      {missing.map((item) => (
        <li key={item.chip}>
          <button type='button' className={styles.promotion} data-add onClick={item.action}>
            <Plus aria-hidden />
            {item.chip}
          </button>
        </li>
      ))}
    </ul>
  )
}
