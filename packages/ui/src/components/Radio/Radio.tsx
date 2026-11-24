import { Radio as BaseRadio } from '@base-ui/react/radio'
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group'
import { mergeClassName } from '../../utils/className'

type RadioGroupVariant = 'stack' | 'inset'

interface RadioGroupProps extends BaseRadioGroup.Props {
  variant?: RadioGroupVariant
}

interface RadioProps extends BaseRadio.Root.Props {}

const RadioGroup = ({ variant = 'stack', className, ...props }: RadioGroupProps) => (
  <BaseRadioGroup
    data-slot='radio-group'
    data-variant={variant}
    className={mergeClassName(
      'grid w-full gap-2 data-[variant=inset]:gap-0 data-[variant=inset]:divide-y data-[variant=inset]:rounded-lg data-[variant=inset]:border data-[variant=inset]:*:px-3 data-[variant=inset]:*:py-2.5',
      className,
    )}
    {...props}
  />
)

const Radio = ({ className, ...props }: RadioProps) => (
  <BaseRadio.Root
    data-slot='radio-group-item'
    className={mergeClassName(
      'group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary',
      className,
    )}
    {...props}
  >
    <BaseRadio.Indicator
      data-slot='radio-group-indicator'
      className='flex size-4 items-center justify-center'
    >
      <span className='absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground' />
    </BaseRadio.Indicator>
  </BaseRadio.Root>
)

export type { RadioGroupProps, RadioGroupVariant, RadioProps }
export { Radio, RadioGroup }
