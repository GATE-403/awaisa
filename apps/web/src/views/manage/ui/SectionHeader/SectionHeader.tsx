import type { ReactNode } from 'react'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title: string
  /** The hint line; may carry inline status links (e.g. "Not closed: 2 visits ›"). */
  description?: ReactNode
  actions?: ReactNode
  /** Phones: the actions float at the window's foot across its width, one tap under the thumb. */
  isFloatingOnPhone?: boolean
}

export const SectionHeader = ({
  title,
  description,
  actions,
  isFloatingOnPhone = false,
}: SectionHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.text}>
      <h2 className={styles.title}>{title}</h2>
      {description && <div className={styles.description}>{description}</div>}
    </div>
    {actions &&
      (isFloatingOnPhone ? (
        <FloatingToolbar align='end' className={styles.floating}>
          {actions}
        </FloatingToolbar>
      ) : (
        <div className={styles.actions}>{actions}</div>
      ))}
  </header>
)
