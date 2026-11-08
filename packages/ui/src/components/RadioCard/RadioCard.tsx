import type { ReactNode } from 'react'
import { cx } from '../../utils/className'
import { Radio, type RadioProps } from '../Radio/Radio'
import styles from './RadioCard.module.css'

interface RadioCardProps extends Omit<RadioProps, 'children' | 'title'> {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  size?: 'md' | 'lg'
  className?: string
}

const RadioCard = ({
  title,
  description,
  children,
  size = 'md',
  className,
  ...radioProps
}: RadioCardProps) => (
  <label className={cx(styles.card, className)} data-size={size}>
    <Radio {...radioProps} />
    <span className={styles.body}>
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
      {children}
    </span>
  </label>
)

export type { RadioCardProps }
export { RadioCard }
