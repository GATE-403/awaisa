import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title: string
  /** The hint line; may carry inline status links (e.g. «Не закрыто: 2 визита ›»). */
  description?: ReactNode
  actions?: ReactNode
}

export const SectionHeader = ({ title, description, actions }: SectionHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.text}>
      <h2 className={styles.title}>{title}</h2>
      {description && <div className={styles.description}>{description}</div>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
)
