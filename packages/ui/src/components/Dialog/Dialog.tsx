import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'
import { cn, mergeClassName } from '../../utils/className'

type DialogVariant = 'modal' | 'panel' | 'sheet'

interface DialogContentProps extends BaseDialog.Popup.Props {
  variant?: DialogVariant
}

interface DialogTitleProps extends BaseDialog.Title.Props {}

interface DialogDescriptionProps extends BaseDialog.Description.Props {}

interface DialogFooterProps extends ComponentProps<'div'> {}

// shadcn's dialog («modal»), its sheet from the top («panel», the search panel) and a form sheet
// («sheet»: centred from 640px, from the bottom edge on phones; the app lays out its inside).
// Dialogs sit above page layers such as the booking screen (60); one opened from another lies on
// top and the one under it steps back under the new dim.
const POPUP_CLASSES: Record<DialogVariant, string> = {
  modal:
    'top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 ring-1 ring-foreground/10 sm:max-w-sm data-open:zoom-in-95 data-closed:zoom-out-95',
  panel:
    'inset-x-0 top-0 flex max-h-dvh flex-col rounded-b-xl pt-[env(safe-area-inset-top)] pb-8 shadow-lg data-open:slide-in-from-top-10 data-closed:slide-out-to-top-10',
  sheet:
    'inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-xl pb-[env(safe-area-inset-bottom)] shadow-lg data-open:slide-in-from-bottom data-closed:slide-out-to-bottom sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(760px,calc(100dvh-3rem))] sm:w-[min(540px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:pb-0 sm:ring-1 sm:ring-foreground/10 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0',
}

const Dialog = BaseDialog.Root

const DialogTrigger = BaseDialog.Trigger

const DialogClose = BaseDialog.Close

const DialogContent = ({ variant = 'modal', className, ...props }: DialogContentProps) => (
  <BaseDialog.Portal>
    <BaseDialog.Backdrop
      data-slot='dialog-overlay'
      data-variant={variant}
      className='fixed inset-0 isolate z-[80] bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs supports-[-webkit-touch-callout:none]:absolute data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'
    />
    <BaseDialog.Popup
      data-slot='dialog-content'
      data-variant={variant}
      className={mergeClassName(
        cn(
          'fixed z-[81] bg-popover text-sm text-popover-foreground duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-nested-dialog-open:z-[80] data-nested-dialog-open:scale-[0.94] motion-reduce:data-nested-dialog-open:scale-100',
          POPUP_CLASSES[variant],
        ),
        className,
      )}
      {...props}
    />
  </BaseDialog.Portal>
)

const DialogTitle = ({ className, ...props }: DialogTitleProps) => (
  <BaseDialog.Title
    data-slot='dialog-title'
    className={mergeClassName('text-base leading-none font-medium', className)}
    {...props}
  />
)

const DialogDescription = ({ className, ...props }: DialogDescriptionProps) => (
  <BaseDialog.Description
    data-slot='dialog-description'
    className={mergeClassName('text-sm text-muted-foreground', className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    data-slot='dialog-footer'
    className={cn(
      '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
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
