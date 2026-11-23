'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Popover } from '@awaisa/ui/Popover'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { achievementLook, achievementTitle } from '@/entities/profile'
import type { PublicProfile } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { describeGoal } from '../lib/goals'
import styles from '../ProfilePage.module.css'

interface AchievementCardProps {
  achievement: PublicProfile['achievements'][number] | null
  anchor: HTMLElement | null
  places: PublicProfile['places']
  /** One's own profile: what is left comes with where to go for it. */
  isOwn: boolean
  onClose: () => void
}

// A medal pressed: its card beside it — the medal large, the whole name (the grid cut it to
// «Постоянный го…»), what it is for, the progress and, on one's own profile, where to go next.
export const AchievementCard = ({
  achievement,
  anchor,
  places,
  isOwn,
  onClose,
}: AchievementCardProps) => {
  const t = useT()
  if (!achievement) return null
  const look = achievementLook(achievement.id)
  const goal = achievement.earned ? null : describeGoal(achievement, places, t)
  const share = Math.min(1, achievement.progress.current / achievement.progress.target)

  return (
    <Popover
      open
      onOpenChange={(open) => !open && onClose()}
      anchor={anchor}
      label={achievementTitle(achievement.title, t)}
      side='bottom'
    >
      <div
        className={styles.medalCard}
        style={{ '--medal': look.color, '--share': share } as CSSProperties}
        data-earned={achievement.earned || undefined}
      >
        <span className={styles.medalCardCoin} aria-hidden>
          {look.emoji}
        </span>
        <div className={styles.medalCardBody}>
          <p className={styles.medalCardTitle}>{achievementTitle(achievement.title, t)}</p>
          <p className={styles.medalCardText}>{t(achievement.description)}</p>
          {achievement.earned ? (
            <p className={styles.medalCardDone}>{t('Получено')}</p>
          ) : (
            <>
              <span className={styles.medalCardTrack} aria-hidden />
              <p className={styles.medalCardText}>
                {achievement.progress.current} {t('из')} {achievement.progress.target}
                {isOwn && goal ? ` · ${goal.hint}` : ''}
              </p>
              {isOwn && goal?.action && (
                <ButtonLink
                  size='sm'
                  render={<NextLink href={goal.action.href} onClick={onClose} />}
                >
                  {goal.action.label}
                </ButtonLink>
              )}
            </>
          )}
        </div>
      </div>
    </Popover>
  )
}
