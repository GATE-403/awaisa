import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'
import { cx, mergeClassName } from '../../utils/className'
import styles from './Dialog.module.css'

interface DialogContentProps extends BaseDialog.Popup.Props {
  variant?: 'modal' | 'panel'
}

interface DialogTitleProps extends BaseDialog.Title.Props {}

interface DialogDescriptionProps extends BaseDialog.Description.Props {}

interface DialogFooterProps extends ComponentProps<'div'> {}

const Dialog = BaseDialog.Root

const DialogTrigger = BaseDialog.Trigger

const DialogClose = BaseDialog.Close

const DialogContent = ({ variant = 'modal', className, ...props }: DialogContentProps) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop className={styles.backdrop} data-variant={variant} />
    <BaseDialog.Popup
      className={mergeClassName(styles.popup, className)}
      data-variant={variant}
      {...props}
    />
  </BaseDialog.Portal>
)

const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <BaseDialog.Title className={mergeClassName(styles.title, className)} {...props} />
)

const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => (
  <BaseDialog.Description className={mergeClassName(styles.description, className)} {...props} />
)

const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div className={cx(styles.footer, className)} {...props} />
)

export type { DialogContentProps, DialogDescriptionProps, DialogFooterProps, DialogTitleProps }
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
}
