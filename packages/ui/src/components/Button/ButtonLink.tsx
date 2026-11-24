'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cn } from '../../utils/className'
import { type ButtonSize, type ButtonVariant, buttonVariants } from './buttonVariants'

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
      ...mergeProps<'a'>(
        { className: cn(buttonVariants({ variant, size, fullWidth }), className) },
        props,
      ),
      'data-slot': 'button',
      'data-variant': variant,
      'data-size': size,
      'data-full-width': fullWidth || undefined,
    },
  })

export type { ButtonLinkProps }
export { ButtonLink }
