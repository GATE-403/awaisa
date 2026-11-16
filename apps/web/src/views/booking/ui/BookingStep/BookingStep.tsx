import type { ReactNode } from 'react'
import styles from './BookingStep.module.css'

interface BookingStepProps {
  id: string
  /** The step as a question: «Что делаем?», «Когда удобно?». */
  title: string
  children: ReactNode
}

// The one open step: a large card under the stack of done ones, asking its question in title
// size. Choosing answers it — the card turns into a stack card and the next question opens.
export const BookingStep = ({ id, title, children }: BookingStepProps) => (
  <section id={`step-${id}`} aria-labelledby={`step-${id}-title`} className={styles.step}>
    <h2 id={`step-${id}-title`} className={styles.title}>
      {title}
    </h2>
    <div className={styles.body}>{children}</div>
  </section>
)
