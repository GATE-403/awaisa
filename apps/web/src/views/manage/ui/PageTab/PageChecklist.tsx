'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Plus } from '@phosphor-icons/react/ssr'
import type { Business } from '@/shared/api/types'
import styles from './PageTab.module.css'

interface PageChecklistProps {
  business: Business
  /** Work photos on the page; null while they load. */
  photoCount: number | null
  onAddLogo: () => void
  onAddPhotos: () => void
  /** "+ About": opens "Edit" on the description. */
  onAddBio: () => void
}

/** Places with this many photos of work show a full first row on the page. */
const PHOTOS_WANTED = 3

// What the page still lacks, while it lacks anything: "+ About · + 3 work photos · + Logo"
// (the cover has its own "Add a cover" on it), each capsule doing its own, in one row with the promotions. Gone once complete.
export const PageChecklist = ({
  business,
  photoCount,
  onAddLogo,
  onAddPhotos,
  onAddBio,
}: PageChecklistProps) => {
  const { t } = useLingui()
  if (photoCount === null) return null
  const photosMissing = Math.max(0, PHOTOS_WANTED - photoCount)
  const missing = [
    !business.description && { chip: t`About me`, action: onAddBio },
    photosMissing > 0 && {
      chip: t`${plural(photosMissing, { one: '# work photo', other: '# work photos' })}`,
      action: onAddPhotos,
    },
    !business.logoUrl && { chip: t`Logo`, action: onAddLogo },
  ].filter((item) => item !== false)
  if (missing.length === 0) return null
  // One row of small capsules, one per thing missing, like "+ Promotion" beside it: a sentence with
  // its action wrapped onto a second line read as a wall of grey ("how to make the design better").
  return (
    <ul className={styles.promotions} data-checklist aria-label={t`Add to your page`}>
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
