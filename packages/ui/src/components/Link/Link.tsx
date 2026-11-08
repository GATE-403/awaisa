'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cx } from '../../utils/className'
import styles from './Link.module.css'

type LinkVariant = 'default' | 'muted' | 'plain'

interface LinkProps extends useRender.ComponentProps<'a'> {
  variant?: LinkVariant
}

const Link = ({ variant = 'default', render, className, ...props }: LinkProps) =>
  useRender({
    defaultTagName: 'a',
    render,
    props: {
      ...mergeProps<'a'>({ className: cx(styles.link, className) }, props),
      'data-variant': variant,
    },
  })

export type { LinkProps, LinkVariant }
export { Link }
