'use client'

import { Camera, Check } from '@phosphor-icons/react/ssr'
import { useT } from '@/shared/i18n'
import styles from '../MasterDayPage.module.css'

interface VisitPhotoButtonProps {
  hasPhoto: boolean
  isUploading: boolean
  onPick: () => void
}

// Right after the visit the master snaps the result (`useVisitPhoto` holds the camera).
export const VisitPhotoButton = ({ hasPhoto, isUploading, onPick }: VisitPhotoButtonProps) => {
  const t = useT()

  return (
    <button type='button' className={styles.photoButton} onClick={onPick} disabled={isUploading}>
      {hasPhoto ? <Check weight='bold' aria-hidden /> : <Camera weight='bold' aria-hidden />}
      {isUploading ? t('Загружаем…') : hasPhoto ? t('Ещё фото работы') : t('Фото работы')}
    </button>
  )
}
