'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { achievementLook, achievementTitle } from '@/entities/profile'
import { useT } from '@/shared/i18n'
import type { Goal } from '../lib/goals'
import styles from '../ProfilePage.module.css'

interface NextGoalProps {
  goal: Goal
}

const RING = 2 * Math.PI * 22

// «Следующая цель» over the medals on one's own profile: the closest medal in a ring that fills
// to its progress, what is left and the one tap that brings it nearer («сделать интерактивнее»).
export const NextGoal = ({ goal }: NextGoalProps) => {
  const t = useT()
  const { achievement } = goal
  const look = achievementLook(achievement.id)
  const share = achievement.progress.current / achievement.progress.target

  return (
    <section
      className={styles.goal}
      aria-labelledby='next-goal-title'
      style={{ '--medal': look.color, '--share': share } as CSSProperties}
    >
      <span className={styles.goalRing} aria-hidden>
        <svg viewBox='0 0 52 52' aria-hidden='true'>
          <circle cx='26' cy='26' r='22' className={styles.goalTrack} />
          <circle
            cx='26'
            cy='26'
            r='22'
            className={styles.goalFill}
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - share)}
          />
        </svg>
        <span className={styles.goalEmoji}>{look.emoji}</span>
      </span>
      <span className={styles.goalText}>
        <span className={styles.goalCaption}>{t('Next goal')}</span>
        <span id='next-goal-title' className={styles.goalTitle}>
          {achievementTitle(achievement.title, t)}
        </span>
        <span className={styles.goalHint}>
          {goal.hint}
          <span className={styles.srOnly}>
            {' · '}
            {achievement.progress.current} {t('of')} {achievement.progress.target}
          </span>
        </span>
      </span>
      {goal.action && (
        <ButtonLink size='sm' variant='secondary' render={<NextLink href={goal.action.href} />}>
          {goal.action.label}
        </ButtonLink>
      )}
    </section>
  )
}
