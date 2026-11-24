import { ArrowBendDownRight } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import styles from './RowNote.module.css'

interface RowNoteProps {
  children: ReactNode
  className?: string
}

// A footnote that belongs to the row or list just above it: a small ↳ leads it, so it reads as
// said about that row, not as a new block (the quick replies' glyph in «Reviews»).
export const RowNote = ({ children, className }: RowNoteProps) => (
  <p className={className ? `${styles.note} ${className}` : styles.note}>
    <ArrowBendDownRight className={styles.glyph} aria-hidden />
    <span>{children}</span>
  </p>
)
