'use client'

import { Heart } from '@phosphor-icons/react/ssr'
import { useT } from '@/shared/i18n'
import { haptic } from '@/shared/lib/nativeBridge'
import { useFavorites } from '../model/useFavorites'
import styles from './FavoriteButton.module.css'

interface FavoriteButtonProps {
  id: string
  label: string
}

export const FavoriteButton = ({ id, label }: FavoriteButtonProps) => {
  const t = useT()
  const { isFavorite, toggle } = useFavorites()
  const isOn = isFavorite(id)

  return (
    <button
      type='button'
      className={styles.button}
      aria-pressed={isOn}
      aria-label={
        isOn
          ? t('Убрать из избранного: {name}', { name: label })
          : t('В избранное: {name}', { name: label })
      }
      onClick={(event) => {
        event.preventDefault()
        toggle(id)
        haptic('selection')
      }}
    >
      <Heart weight={isOn ? 'fill' : 'bold'} aria-hidden />
    </button>
  )
}
