'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cx } from '../../utils/className'
import type { ButtonSize, ButtonVariant } from './Button'
import styles from './Button.module.css'

interface ButtonLinkProps extends useRender.ComponentProps<'a'> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

// Navigation styled as a button: keeps link semantics (Base UI Button would add role="button").
const ButtonLink = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  render,
  className,
  ...props
}: ButtonLinkProps) =>
  useRender({
    defaultTagName: 'a',
    render,
    props: {
      ...mergeProps<'a'>({ className: cx(styles.button, className) }, props),
      'data-variant': variant,
      'data-size': size,
      'data-full-width': fullWidth || undefined,
    },
  })

export type { ButtonLinkProps }
export { ButtonLink }
