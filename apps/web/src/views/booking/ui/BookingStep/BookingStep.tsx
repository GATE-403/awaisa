'use client'

import type { Icon } from '@phosphor-icons/react'
import { CaretDown, Check } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import styles from './BookingStep.module.css'

interface BookingStepProps {
  id: string
  icon: Icon
  title: string
  summary?: string
  /** Why a step not reached yet is closed: «Сначала выберите услугу». */
  hint?: string
  isComplete: boolean
  isCollapsed?: boolean
  onToggle?: () => void
  children: ReactNode
}

// Each step is a disclosure: its glyph says what it is (no numbers), a check says it is done,
// and the header folds or unfolds it.
export const BookingStep = ({
  id,
  icon: StepIcon,
  title,
  summary,
  hint,
  isComplete,
  isCollapsed = false,
  onToggle,
  children,
}: BookingStepProps) => {
  const t = useT()
  const isWaiting = Boolean(hint) && isCollapsed && !isComplete && !summary

  return (
    <section
      id={`step-${id}`}
      aria-labelledby={`step-${id}-title`}
      className={styles.step}
      data-complete={isComplete || undefined}
      data-collapsed={isCollapsed || undefined}
    >
      <header className={styles.header}>
        <span className={styles.badge} aria-hidden>
          {isComplete ? (
            <Check className={styles.check} weight='bold' />
          ) : (
            <StepIcon weight='fill' />
          )}
        </span>
        <div className={styles.titles}>
          <h2 id={`step-${id}-title`} className={styles.title}>
            {title}
          </h2>
          {summary && <p className={styles.summary}>{summary}</p>}
          {isWaiting && <p className={styles.hint}>{hint}</p>}
        </div>
        {/* The step in progress needs no «Свернуть»; done steps offer to change, and a later one
          says what it waits for instead of opening empty. */}
        {onToggle && !isWaiting && (isCollapsed || isComplete) && (
          <button
            type='button'
            className={styles.toggle}
            aria-expanded={!isCollapsed}
            aria-controls={`step-${id}-body`}
            onClick={onToggle}
          >
            {isCollapsed ? t(isComplete ? 'Изменить' : 'Показать') : t('Свернуть')}
            <CaretDown className={styles.caret} weight='bold' aria-hidden />
          </button>
        )}
      </header>
      {!isCollapsed && (
        <div id={`step-${id}-body`} className={styles.body}>
          {children}
        </div>
      )}
    </section>
  )
}
