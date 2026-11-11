'use client'

import { Toast as BaseToast } from '@base-ui/react/toast'
import type { ReactNode } from 'react'
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

const ToastList = () => {
  const { toasts, close } = BaseToast.useToastManager()

  return toasts.map((toast) => {
    const Icon = TOAST_ICONS[isToastType(toast.type) ? toast.type : 'info']
    const onOpen = (toast.data as ToastData | undefined)?.onOpen

    return (
      <BaseToast.Root
        key={toast.id}
        toast={toast}
        swipeDirection='up'
        className={styles.toast}
        data-openable={onOpen ? '' : undefined}
      >
        {onOpen && (
          <button
            type='button'
            className={styles.open}
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
  <BaseToast.Provider timeout={3500} limit={3}>
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
