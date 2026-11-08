import type { ComponentProps } from 'react'
import { cx } from '../../utils/className'
import styles from './Skeleton.module.css'

interface SkeletonProps extends ComponentProps<'div'> {}

const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <div aria-hidden='true' className={cx(styles.skeleton, className)} {...props} />
)

export type { SkeletonProps }
export { Skeleton }
