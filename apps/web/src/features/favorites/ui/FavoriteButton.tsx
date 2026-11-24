'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Heart } from '@phosphor-icons/react/ssr'
import { haptic } from '@/shared/lib/nativeBridge'
import { useFavorites } from '../model/useFavorites'
import styles from './FavoriteButton.module.css'

interface FavoriteButtonProps {
  id: string
  label: string
}

export const FavoriteButton = ({ id, label }: FavoriteButtonProps) => {
  const { t } = useLingui()
  const { isFavorite, toggle } = useFavorites()
  const isOn = isFavorite(id)

  return (
    <button
      type='button'
      className={styles.button}
      aria-pressed={isOn}
      aria-label={
        isOn
          ? t`Remove from favourites: ${ph({ name: label })}`
          : t`Add to favourites: ${ph({ name: label })}`
      }
      onClick={(event) => {
        event.preventDefault()
        toggle(id)
        haptic('selection')
      }}
    >
      <Heart weight={isOn ? 'fill' : 'regular'} aria-hidden />
    </button>
  )
}
