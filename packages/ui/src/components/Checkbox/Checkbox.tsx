import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { mergeClassName } from '../../utils/className'
import styles from './Checkbox.module.css'

interface CheckboxProps extends BaseCheckbox.Root.Props {}

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

const MinusIcon = () => (
  <svg viewBox='0 0 16 16' fill='none' aria-hidden='true' className={styles.minusIcon}>
    <path d='M4 8h8' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
)

const Checkbox = ({ className, ...props }: CheckboxProps) => (
  <BaseCheckbox.Root className={mergeClassName(styles.root, className)} {...props}>
    <BaseCheckbox.Indicator className={styles.indicator}>
      <CheckIcon />
      <MinusIcon />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
)

export type { CheckboxProps }
export { Checkbox }
