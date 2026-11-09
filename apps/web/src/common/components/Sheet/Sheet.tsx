import { Dialog, DialogClose, DialogContent, DialogTitle } from '@awaisa/ui/Dialog'
import type { ReactNode } from 'react'
import styles from './Sheet.module.css'

interface SheetAction {
  label: string
  form?: string
  disabled?: boolean
  onClick?: () => void
}

interface SheetProps {
  title: string
  onClose: () => void
  action?: SheetAction
  cancelLabel?: string | null
  children: ReactNode
}

// iOS form sheet: «Отмена» on the left, the title in the middle, the confirming action on the right.
export const Sheet = ({ title, onClose, action, cancelLabel = 'Отмена', children }: SheetProps) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent variant='sheet'>
      <header className={styles.bar}>
        {cancelLabel ? (
          <DialogClose className={styles.barButton}>{cancelLabel}</DialogClose>
        ) : (
          <span />
        )}
        <DialogTitle className={styles.barTitle}>{title}</DialogTitle>
        {action ? (
          <button
            type={action.form ? 'submit' : 'button'}
            form={action.form}
            className={styles.barAction}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ) : (
          <span />
        )}
      </header>
      <div className={styles.body}>{children}</div>
    </DialogContent>
  </Dialog>
)
