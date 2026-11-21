'use client'

import type { CSSProperties } from 'react'
import type { PublicProfile } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { achievementTitle } from '../lib/achievementTitle'
import styles from './Achievements.module.css'

// Each achievement its own colour and emoji, like medals in 2GIS: a lit coin when earned, a quiet
// grey goal (the emoji faded) with progress when not.
const LOOK: Record<string, { emoji: string; color: string }> = {
  'first-visit': { emoji: '🎉', color: 'var(--system-green)' },
  'visits-10': { emoji: '💪', color: 'var(--system-blue)' },
  'visits-25': { emoji: '🏆', color: 'var(--system-indigo)' },
  regular: { emoji: '👑', color: 'var(--system-orange)' },
  explorer: { emoji: '🧭', color: 'var(--system-teal)' },
  'places-5': { emoji: '🗺️', color: 'var(--system-purple)' },
  'early-bird': { emoji: '🌅', color: 'var(--system-yellow)' },
  'first-review': { emoji: '💬', color: 'var(--system-pink)' },
  critic: { emoji: '⭐', color: 'var(--system-red)' },
  friend: { emoji: '🤝', color: 'var(--system-cyan)' },
  'friends-3': { emoji: '🥳', color: 'var(--system-brown)' },
  year: { emoji: '🎂', color: 'var(--system-mint)' },
}

/** The emoji and colour of an achievement, for the showcase by the name. */
export const achievementLook = (id: string) =>
  LOOK[id] ?? { emoji: '🏅', color: 'var(--system-blue)' }

interface AchievementsProps {
  items: PublicProfile['achievements']
}

export const Achievements = ({ items }: AchievementsProps) => {
  const t = useT()

  return (
    <ul className={styles.grid}>
      {items.map((item) => {
        const look = LOOK[item.id] ?? { emoji: '🏅', color: 'var(--system-blue)' }
        return (
          <li
            key={item.id}
            className={styles.item}
            data-earned={item.earned || undefined}
            style={{ '--medal': look.color } as CSSProperties}
          >
            <span className={styles.medal} aria-hidden>
              <span className={styles.emoji}>{look.emoji}</span>
            </span>
            <span className={styles.title}>{achievementTitle(item.title, t)}</span>
            <span className={styles.description}>
              {item.earned
                ? t(item.description)
                : t('{current} из {total}', {
                    current: item.progress.current,
                    total: item.progress.target,
                  })}
            </span>
            {!item.earned && (
              <span
                className={styles.track}
                aria-hidden
                style={
                  {
                    '--done': `${Math.round((item.progress.current / item.progress.target) * 100)}%`,
                  } as CSSProperties
                }
              />
            )}
            <span className={styles.srOnly}>
              {item.earned ? t('Получено') : t('Цель: {goal}', { goal: t(item.description) })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
