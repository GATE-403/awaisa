import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export const SectionHeader = ({ title, description, actions }: SectionHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.text}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
)
