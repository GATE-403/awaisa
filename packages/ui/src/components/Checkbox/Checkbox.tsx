import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { CheckIcon, MinusIcon } from '@phosphor-icons/react/ssr'
import { mergeClassName } from '../../utils/className'

interface CheckboxProps extends BaseCheckbox.Root.Props {}

const Checkbox = ({ className, ...props }: CheckboxProps) => (
  <BaseCheckbox.Root
    data-slot='checkbox'
    className={mergeClassName(
      'peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-checked:bg-primary',
      className,
    )}
    {...props}
  >
    <BaseCheckbox.Indicator
      data-slot='checkbox-indicator'
      className='group/indicator grid place-content-center text-current transition-none [&>svg]:size-3.5'
    >
      <CheckIcon weight='bold' className='group-data-indeterminate/indicator:hidden' />
      <MinusIcon weight='bold' className='hidden group-data-indeterminate/indicator:block' />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>
)

export type { CheckboxProps }
export { Checkbox }
