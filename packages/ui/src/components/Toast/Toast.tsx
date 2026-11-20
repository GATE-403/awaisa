'use client'

import { Toast as BaseToast } from '@base-ui/react/toast'
import { type PointerEvent, type ReactNode, useRef } from 'react'
import styles from './Toast.module.css'

type ToastType = 'success' | 'error' | 'info'

type ToastOptions = {
  title: ReactNode
  description?: ReactNode
  type?: ToastType
  timeout?: number
  /** A reversible action, e.g. «Вернуть» after a cancellation. */
  action?: { label: string; onClick: () => void }
  /** Tapping the toast itself opens what it is about, like a notification on iOS. */
  onOpen?: () => void
}

type ToastData = { onOpen?: () => void }

interface ToastProviderProps {
  children: ReactNode
}

const SuccessIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='12' cy='12' r='11' fill='var(--color-success)' />
    <path
      d='m7 12.5 3.2 3.2L17 9'
      fill='none'
      stroke='var(--color-primary-foreground)'
      strokeWidth='2.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const ErrorIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='12' cy='12' r='11' fill='var(--color-danger)' />
    <path
      d='M12 6.8v6.4'
      stroke='var(--color-primary-foreground)'
      strokeWidth='2.4'
      strokeLinecap='round'
    />
    <circle cx='12' cy='16.9' r='1.4' fill='var(--color-primary-foreground)' />
  </svg>
)

const InfoIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='12' cy='12' r='11' fill='var(--color-primary)' />
    <circle cx='12' cy='7.4' r='1.4' fill='var(--color-primary-foreground)' />
    <path
      d='M12 10.8v6.4'
      stroke='var(--color-primary-foreground)'
      strokeWidth='2.4'
      strokeLinecap='round'
    />
  </svg>
)

const TOAST_ICONS: Record<ToastType, () => ReactNode> = {
  success: SuccessIcon,
  error: ErrorIcon,
  info: InfoIcon,
}

const isToastType = (value: unknown): value is ToastType =>
  value === 'success' || value === 'error' || value === 'info'

// A tap opens the toast; a swipe only dismisses it. The press point tells them apart (a swiped
// toast may still get a click when the finger lifts).
const TAP_SLOP_PX = 8

const ToastList = () => {
  const { toasts, close } = BaseToast.useToastManager()
  const pressRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (event: PointerEvent) => {
    pressRef.current = { x: event.clientX, y: event.clientY }
  }

  const isTap = (event: { clientX: number; clientY: number }) => {
    const press = pressRef.current
    if (!press) return true
    return Math.hypot(event.clientX - press.x, event.clientY - press.y) < TAP_SLOP_PX
  }

  return toasts.map((toast) => {
    const Icon = TOAST_ICONS[isToastType(toast.type) ? toast.type : 'info']
    const onOpen = (toast.data as ToastData | undefined)?.onOpen

    return (
      <BaseToast.Root
        key={toast.id}
        toast={toast}
        swipeDirection={['up', 'left', 'right']}
        className={styles.toast}
        data-openable={onOpen ? '' : undefined}
        onPointerDown={handlePointerDown}
        onClick={(event) => {
          // The covering button takes no pointer (Base UI does not start a swipe on a button), so
          // a tap on the toast lands here; the button stays for the keyboard and screen readers.
          if (!onOpen || !isTap(event)) return
          if ((event.target as HTMLElement).closest('button:not([data-open])')) return
          close(toast.id)
          onOpen()
        }}
      >
        {onOpen && (
          <button
            type='button'
            className={styles.open}
            data-open
            aria-label='Открыть'
            onClick={() => {
              close(toast.id)
              onOpen()
            }}
          />
        )}
        <span className={styles.icon}>
          <Icon />
        </span>
        <span className={styles.content}>
          <BaseToast.Title className={styles.title} />
          <BaseToast.Description className={styles.description} />
        </span>
        {toast.actionProps && <BaseToast.Action className={styles.action} />}
      </BaseToast.Root>
    )
  })
}

const ToastProvider = ({ children }: ToastProviderProps) => (
  // 6 s, not 3.5: a slow reader (or someone at 200% zoom) lost «Перенесено: …» before the end.
  // Hover and focus pause it; undo toasts set their own, longer timeout.
  <BaseToast.Provider timeout={6000} limit={3}>
    {children}
    <BaseToast.Portal>
      <BaseToast.Viewport className={styles.viewport}>
        <ToastList />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  </BaseToast.Provider>
)

const useToast = () => {
  const manager = BaseToast.useToastManager()

  return {
    show: ({ title, description, type = 'info', timeout, action, onOpen }: ToastOptions) => {
      const id: string = manager.add({
        title,
        description,
        type,
        timeout,
        data: { onOpen } satisfies ToastData,
        actionProps: action && {
          children: action.label,
          onClick: () => {
            manager.close(id)
            action.onClick()
          },
        },
      })

      return id
    },
    close: manager.close,
  }
}

export type { ToastOptions, ToastProviderProps, ToastType }
export { ToastProvider, useToast }
