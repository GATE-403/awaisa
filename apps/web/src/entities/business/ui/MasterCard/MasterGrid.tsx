import type { ReactNode } from 'react'
import styles from './MasterGrid.module.css'

interface MasterGridProps {
  children: ReactNode
}

// A place's masters as `MasterCard`s three a row, four from 640px (the place's «Мастера» tab).
export const MasterGrid = ({ children }: MasterGridProps) => (
  <ul className={styles.grid}>{children}</ul>
)
