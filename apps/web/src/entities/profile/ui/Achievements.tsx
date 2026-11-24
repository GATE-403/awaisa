'use client'

import { CaretDown } from '@phosphor-icons/react/ssr'
import { type CSSProperties, type MouseEvent, useState } from 'react'
import type { PublicProfile } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { toBusinessDayKey } from '@/shared/lib/businessTime'
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

type Achievement = PublicProfile['achievements'][number]

interface AchievementsProps {
  items: Achievement[]
  /** A medal pressed: its card opens beside it (what it is, what is left, where to go). */
  onSelect?: (item: Achievement, anchor: HTMLElement) => void
}

const share = (item: Achievement) => item.progress.current / item.progress.target

// A collection, not a list of grey discs: the medals earned stand in one row like trophies on a
// shelf, each with the month it came; the goals fold into one line naming the two closest and
// open in place («просто список разных достижений … не интересно»).
export const Achievements = ({ items, onSelect }: AchievementsProps) => {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const earned = items.filter((item) => item.earned)
  const goals = items
    .filter((item) => !item.earned)
    .sort((first, second) => share(second) - share(first))
  const closest = goals
    .slice(0, 2)
    .map((item) => achievementTitle(item.title, t))
    .join(', ')
  // With nothing earned yet the goals are all there is: shown open.
  const areGoalsShown = isOpen || earned.length === 0

  const renderMedal = (item: Achievement, index: number, isGoal: boolean) => {
    const look = achievementLook(item.id)
    const Tag = onSelect ? 'button' : 'span'
    const dayKey = item.earnedAt ? toBusinessDayKey(item.earnedAt) : null
    return (
      <li
        key={item.id}
        className={styles.item}
        data-earned={item.earned || undefined}
        style={{ '--medal': look.color, '--i': index } as CSSProperties}
      >
        <Tag
          {...(onSelect
            ? {
                type: 'button' as const,
                onClick: (event: MouseEvent<HTMLButtonElement>) =>
                  onSelect(item, event.currentTarget),
              }
            : {})}
          className={styles.press}
        >
          <span className={styles.medal} aria-hidden>
            <span className={styles.emoji}>{look.emoji}</span>
          </span>
          <span className={styles.title}>{achievementTitle(item.title, t)}</span>
          {isGoal ? (
            <>
              <span className={styles.description}>
                {t('{current} of {total}', {
                  current: item.progress.current,
                  total: item.progress.target,
                })}
              </span>
              <span
                className={styles.track}
                aria-hidden
                style={{ '--done': `${Math.round(share(item) * 100)}%` } as CSSProperties}
              />
            </>
          ) : (
            // The month it came, like the date on a trophy; the description lives in its card.
            dayKey && (
              <span className={styles.description}>
                {t.monthShort(dayKey)} {dayKey.slice(0, 4)}
              </span>
            )
          )}
          <span className={styles.srOnly}>
            {item.earned ? t('Earned') : t('Goal: {goal}', { goal: t(item.description) })}
          </span>
        </Tag>
      </li>
    )
  }

  return (
    <div className={styles.collection}>
      {earned.length > 0 && (
        <ul className={styles.shelf} data-edge-fade aria-label={t('Earned')}>
          {earned.map((item, index) => renderMedal(item, index, false))}
        </ul>
      )}
      {goals.length > 0 && earned.length > 0 && (
        <button
          type='button'
          className={styles.more}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? (
            t('Hide goals')
          ) : (
            // One text box: as flex items the bold count and the rest broke into columns.
            <span>
              <strong>{t.count(goals.length, ['goal', 'goals'])}</strong>
              {' · '}
              {t('closest: {names}', { names: closest })}
            </span>
          )}
          <CaretDown className={styles.moreCaret} data-open={isOpen || undefined} aria-hidden />
        </button>
      )}
      {goals.length > 0 && areGoalsShown && (
        <ul className={styles.grid} aria-label={t('Goals')}>
          {goals.map((item, index) => renderMedal(item, index, true))}
        </ul>
      )}
    </div>
  )
}
