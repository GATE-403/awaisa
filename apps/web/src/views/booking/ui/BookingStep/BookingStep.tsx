import type { Icon } from '@phosphor-icons/react'
import { CaretDown, Check } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import styles from './BookingStep.module.css'

interface BookingStepProps {
  id: string
  icon: Icon
  title: string
  summary?: string
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
  isComplete,
  isCollapsed = false,
  onToggle,
  children,
}: BookingStepProps) => (
  <section
    id={`step-${id}`}
    aria-labelledby={`step-${id}-title`}
    className={styles.step}
    data-complete={isComplete || undefined}
    data-collapsed={isCollapsed || undefined}
  >
    <header className={styles.header}>
      <span className={styles.badge} aria-hidden>
        {isComplete ? <Check className={styles.check} weight='bold' /> : <StepIcon weight='fill' />}
      </span>
      <div className={styles.titles}>
        <h2 id={`step-${id}-title`} className={styles.title}>
          {title}
        </h2>
        {summary && <p className={styles.summary}>{summary}</p>}
      </div>
      {onToggle && (
        <button
          type='button'
          className={styles.toggle}
          aria-expanded={!isCollapsed}
          aria-controls={`step-${id}-body`}
          onClick={onToggle}
        >
          {isCollapsed ? (isComplete ? 'Изменить' : 'Показать') : 'Свернуть'}
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
