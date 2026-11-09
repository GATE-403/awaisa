import type { ReactNode } from 'react'
import styles from '@/views/manage/ui/manageForms.module.css'

interface EmptyStateProps {
  title: string
  text: string
  action?: ReactNode
}

export const EmptyState = ({ title, text, action }: EmptyStateProps) => (
  <div className={styles.emptyState}>
    <p className={styles.emptyTitle}>{title}</p>
    <p className={styles.emptyText}>{text}</p>
    {action}
  </div>
)
