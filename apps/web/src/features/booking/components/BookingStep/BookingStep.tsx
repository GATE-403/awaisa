import { Button } from '@awaisa/ui/Button'
import { Check } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import styles from './BookingStep.module.css'

interface BookingStepProps {
  id: string
  index: number
  title: string
  summary?: string
  isComplete: boolean
  isCollapsed?: boolean
  onEdit?: () => void
  children: ReactNode
}

export const BookingStep = ({
  id,
  index,
  title,
  summary,
  isComplete,
  isCollapsed = false,
  onEdit,
  children,
}: BookingStepProps) => (
  <section
    id={`step-${id}`}
    aria-labelledby={`step-${id}-title`}
    className={styles.step}
    data-complete={isComplete || undefined}
  >
    <header className={styles.header}>
      <span className={styles.badge} aria-hidden>
        {isComplete ? <Check className={styles.check} weight='bold' /> : index}
      </span>
      <div className={styles.titles}>
        <h2 id={`step-${id}-title`} className={styles.title}>
          {title}
        </h2>
        {summary && <p className={styles.summary}>{summary}</p>}
      </div>
      {isCollapsed && onEdit && (
        <Button variant='link' size='sm' onClick={onEdit} className={styles.edit}>
          Изменить
        </Button>
      )}
    </header>
    {!isCollapsed && children}
  </section>
)
