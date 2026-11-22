'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
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
  const t = useT()
  if (photoCount === null) return null
  const photosMissing = Math.max(0, PHOTOS_WANTED - photoCount)
  const missing = [
    !business.coverUrl && {
      text: t('обложку'),
      action: onAddCover,
      label: t('Добавить обложку'),
    },
    photosMissing > 0 && {
      text:
        photoCount === 0
          ? t.count(photosMissing, ['фото работы', 'фото работ', 'фото работ'])
          : t('ещё {photos}', {
              photos: t.count(photosMissing, ['фото работы', 'фото работ', 'фото работ']),
            }),
      action: onAddPhotos,
      label: t('Добавить фото'),
    },
    !business.logoUrl && { text: t('логотип'), action: onAddLogo, label: t('Добавить логотип') },
    !business.description && {
      text: t('пару слов о себе'),
      action: onAddDescription,
      label: t('Написать'),
    },
  ].filter((item) => item !== false)
  const [first] = missing
  if (!first) return null
  const isAboutPhotos = !business.coverUrl || photosMissing > 0
  const list =
    missing.length === 1
      ? first.text
      : t('{items} и {last}', {
          items: missing
            .slice(0, -1)
            .map((item) => item.text)
            .join(', '),
          last: missing.at(-1)?.text ?? '',
        })

  return (
    <p className={styles.checklist}>
      <span>
        {isAboutPhotos
          ? t('Добавьте {list}: с фото записываются чаще.', { list })
          : t('Добавьте {list}, и страница будет готова.', { list })}
      </span>{' '}
      <button type='button' className={styles.checklistAction} onClick={first.action}>
        {first.label}
        <CaretRight weight='bold' aria-hidden />
      </button>
    </p>
  )
}
