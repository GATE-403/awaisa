import type { ComponentProps } from 'react'
import { cn } from '../../utils/className'

interface SkeletonProps extends ComponentProps<'div'> {}

const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <div
    aria-hidden='true'
    data-slot='skeleton'
    className={cn('animate-pulse rounded-md bg-muted', className)}
    {...props}
  />
)

export type { SkeletonProps }
export { Skeleton }
