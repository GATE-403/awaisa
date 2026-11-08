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
}

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
  const { toasts } = BaseToast.useToastManager()

  return toasts.map((toast) => {
    const Icon = TOAST_ICONS[isToastType(toast.type) ? toast.type : 'info']

    return (
      <BaseToast.Root key={toast.id} toast={toast} swipeDirection='up' className={styles.toast}>
        <span className={styles.icon}>
          <Icon />
        </span>
        <span className={styles.content}>
          <BaseToast.Title className={styles.title} />
          <BaseToast.Description className={styles.description} />
        </span>
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
    show: ({ title, description, type = 'info', timeout }: ToastOptions) =>
      manager.add({ title, description, type, timeout }),
    close: manager.close,
  }
}

export type { ToastOptions, ToastProviderProps, ToastType }
export { ToastProvider, useToast }
