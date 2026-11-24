import { Radio as BaseRadio } from '@base-ui/react/radio'
import type { ReactNode } from 'react'
import { cn } from '../../utils/className'

interface RadioCardProps extends Omit<BaseRadio.Root.Props, 'children' | 'title' | 'className'> {
  title: ReactNode
  description?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
  size?: 'md' | 'lg'
  className?: string
}

// shadcn's choice card: a bordered field with the radio at its end, tinted when chosen.
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
  <label
    data-slot='radio-card'
    data-size={size}
    className={cn(
      'flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-[size=lg]:p-4 not-has-data-disabled:hover:bg-muted/50 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10',
      className,
    )}
  >
    {leading}
    <span className='flex min-w-0 flex-1 flex-col gap-0.5 leading-snug'>
      <span className='text-sm font-medium'>{title}</span>
      {description && <span className='text-sm text-muted-foreground'>{description}</span>}
      {children}
    </span>
    {trailing && <span className='shrink-0 text-sm text-muted-foreground'>{trailing}</span>}
    <BaseRadio.Root
      data-slot='radio-group-item'
      className='relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none dark:bg-input/30 data-checked:border-primary data-checked:bg-primary dark:data-checked:bg-primary'
      {...radioProps}
    >
      <BaseRadio.Indicator className='flex size-4 items-center justify-center'>
        <span className='absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground' />
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  </label>
)

export type { RadioCardProps }
export { RadioCard }
