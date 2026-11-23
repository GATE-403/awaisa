'use client'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@awaisa/ui/Dialog'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useT } from '@/shared/i18n'
import { useFocusedFieldInView } from '@/shared/lib/hooks/useFocusedFieldInView'
import styles from './Sheet.module.css'
import { useSheetDrag } from './useSheetDrag'

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
// Pull the top bar down to dismiss it, like an iOS sheet. A field that takes the caret is set above
// the phone's keyboard; in the Android app the sheet takes the keyboard itself (`overlay`), so the
// page under it is not laid out again while the keyboard slides in.
export const Sheet = ({ title, onClose, action, cancelLabel = 'Отмена', children }: SheetProps) => {
  const t = useT()
  const dragHandlers = useSheetDrag(onClose)
  const [isOpen, setIsOpen] = useState(false)
  // The body is portalled in only once the dialog opens, so the hook follows the element itself.
  const [body, setBody] = useState<HTMLDivElement | null>(null)
  const bodyRef = useMemo(() => ({ current: body }), [body])
  useFocusedFieldInView(bodyRef)

  // Callers mount the sheet already «open»; opening it a frame later lets it slide up, and
  // closing waits for the slide down before the caller unmounts it.
  useEffect(() => {
    setIsOpen(true)
  }, [])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && setIsOpen(false)}
      onOpenChangeComplete={(open) => !open && onClose()}
    >
      <DialogContent variant='sheet'>
        <header className={styles.bar} {...dragHandlers}>
          <span className={styles.grabber} aria-hidden='true' />
          {cancelLabel ? (
            <DialogClose className={styles.barButton}>{t(cancelLabel)}</DialogClose>
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
        <div ref={setBody} className={styles.body}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
