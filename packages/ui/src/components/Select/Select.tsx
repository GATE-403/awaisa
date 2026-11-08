import { Select as BaseSelect } from '@base-ui/react/select'
import type { ReactNode } from 'react'
import { cx } from '../../utils/className'
import styles from './Select.module.css'

type SelectItem<Value> = {
  value: Value
  label: ReactNode
  disabled?: boolean
}

interface SelectProps<Value>
  extends Omit<BaseSelect.Root.Props<Value>, 'items' | 'children' | 'multiple'> {
  items: SelectItem<Value>[]
  placeholder?: ReactNode
  className?: string
  'aria-label'?: string
}

const ChevronsIcon = () => (
  <svg viewBox='0 0 16 16' fill='none' aria-hidden='true' className={styles.icon}>
    <path
      d='m5 6 3-3 3 3M5 10l3 3 3-3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox='0 0 16 16' fill='none' aria-hidden='true' className={styles.icon}>
    <path
      d='M3.5 8.5 6.5 11.5 12.5 4.5'
      stroke='currentColor'
      strokeWidth='1.75'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const Select = <Value,>({
  items,
  placeholder,
  className,
  'aria-label': ariaLabel,
  ...props
}: SelectProps<Value>) => (
  <BaseSelect.Root items={items} {...props}>
    <BaseSelect.Trigger className={cx(styles.trigger, className)} aria-label={ariaLabel}>
      <BaseSelect.Value className={styles.value} placeholder={placeholder} />
      <BaseSelect.Icon className={styles.triggerIcon}>
        <ChevronsIcon />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        className={styles.positioner}
        sideOffset={4}
        alignItemWithTrigger={false}
      >
        <BaseSelect.Popup className={styles.popup}>
          <BaseSelect.List className={styles.list}>
            {items.map((item) => (
              <BaseSelect.Item
                key={String(item.value)}
                value={item.value}
                disabled={item.disabled}
                className={styles.item}
              >
                <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className={styles.itemIndicator}>
                  <CheckIcon />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>
)

export type { SelectItem, SelectProps }
export { Select }
