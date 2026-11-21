'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import type { Business } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './PageTab.module.css'

interface PageChecklistProps {
  business: Business
  /** Work photos on the page; null while they load. */
  photoCount: number | null
  onAddCover: () => void
  onAddLogo: () => void
  onAddPhotos: () => void
  onAddDescription: () => void
}

/** Places with this many photos of work show a full first row on the page. */
const PHOTOS_WANTED = 3

// What the page still lacks, in one line, while it lacks anything: «Добавьте обложку и ещё 2 фото
// работ: с фото записываются чаще» (or «…, и страница будет готова» for the rest), the action
// taking the first thing missing. Gone once complete.
export const PageChecklist = ({
  business,
  photoCount,
  onAddCover,
  onAddLogo,
  onAddPhotos,
  onAddDescription,
}: PageChecklistProps) => {
  if (photoCount === null) return null
  const photosMissing = Math.max(0, PHOTOS_WANTED - photoCount)
  const missing = [
    !business.coverUrl && { text: 'обложку', action: onAddCover, label: 'Добавить обложку' },
    photosMissing > 0 && {
      text:
        photoCount === 0
          ? pluralize(photosMissing, ['фото работы', 'фото работ', 'фото работ'])
          : `ещё ${pluralize(photosMissing, ['фото работы', 'фото работ', 'фото работ'])}`,
      action: onAddPhotos,
      label: 'Добавить фото',
    },
    !business.logoUrl && { text: 'логотип', action: onAddLogo, label: 'Добавить логотип' },
    !business.description && {
      text: 'пару слов о себе',
      action: onAddDescription,
      label: 'Написать',
    },
  ].filter((item) => item !== false)
  const [first] = missing
  if (!first) return null
  const isAboutPhotos = !business.coverUrl || photosMissing > 0
  const list =
    missing.length === 1
      ? first.text
      : `${missing
          .slice(0, -1)
          .map((item) => item.text)
          .join(', ')} и ${missing.at(-1)?.text}`

  return (
    <p className={styles.checklist}>
      <span>
        Добавьте {list}
        {isAboutPhotos ? ': с фото записываются чаще.' : ', и страница будет готова.'}
      </span>{' '}
      <button type='button' className={styles.checklistAction} onClick={first.action}>
        {first.label}
        <CaretRight weight='bold' aria-hidden />
      </button>
    </p>
  )
}
