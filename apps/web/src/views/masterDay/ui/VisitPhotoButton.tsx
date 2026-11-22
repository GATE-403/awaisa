'use client'

import { Camera, Check } from '@phosphor-icons/react/ssr'
import styles from '../MasterDayPage.module.css'

interface VisitPhotoButtonProps {
  hasPhoto: boolean
  isUploading: boolean
  onPick: () => void
}

// Right after the visit the master snaps the result (`useVisitPhoto` holds the camera).
export const VisitPhotoButton = ({ hasPhoto, isUploading, onPick }: VisitPhotoButtonProps) => (
  <button type='button' className={styles.photoButton} onClick={onPick} disabled={isUploading}>
    {hasPhoto ? <Check weight='bold' aria-hidden /> : <Camera weight='bold' aria-hidden />}
    {isUploading ? 'Загружаем…' : hasPhoto ? 'Ещё фото работы' : 'Фото работы'}
  </button>
)
