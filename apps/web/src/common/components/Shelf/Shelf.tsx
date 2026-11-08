import type { ReactNode } from 'react'
import styles from './Shelf.module.css'

interface ShelfProps {
  children: ReactNode
  columns?: 3 | 4
  label: string
}

export const Shelf = ({ children, columns = 4, label }: ShelfProps) => (
  <ul aria-label={label} className={styles.shelf} data-columns={columns}>
    {children}
  </ul>
)
