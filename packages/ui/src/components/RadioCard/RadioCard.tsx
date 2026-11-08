import { Radio as BaseRadio } from '@base-ui/react/radio'
import type { ReactNode } from 'react'
import { cx } from '../../utils/className'
import styles from './RadioCard.module.css'

interface RadioCardProps extends Omit<BaseRadio.Root.Props, 'children' | 'title' | 'className'> {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
  size?: 'md' | 'lg'
  className?: string
}

const CheckIcon = () => (
  <svg viewBox='0 0 16 16' fill='none' aria-hidden='true' className={styles.checkIcon}>
    <path
      d='M3.5 8.5 6.5 11.5 12.5 4.5'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const RadioCard = ({
  title,
  description,
  leading,
  trailing,
  children,
  size = 'md',
  className,
  ...radioProps
}: RadioCardProps) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: BaseRadio.Root inside is the control (renders role=radio with a hidden input)
  <label className={cx(styles.card, className)} data-size={size}>
    {leading}
    <span className={styles.body}>
      <span className={styles.title}>{title}</span>
      {description && <span className={styles.description}>{description}</span>}
      {children}
    </span>
    {trailing && <span className={styles.trailing}>{trailing}</span>}
    <BaseRadio.Root className={styles.check} {...radioProps}>
      <BaseRadio.Indicator className={styles.checkIndicator}>
        <CheckIcon />
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  </label>
)

export type { RadioCardProps }
export { RadioCard }
