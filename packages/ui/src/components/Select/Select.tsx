import { Select as BaseSelect } from '@base-ui/react/select'
import { CaretDownIcon, CaretUpIcon, CheckIcon } from '@phosphor-icons/react/ssr'
import type { ReactNode } from 'react'
import { cn } from '../../utils/className'

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
  /** `plain`: no box, the value on the right, for a Settings-style row. */
  variant?: 'default' | 'plain'
}

// shadcn's select. Its list sits above the app's sheets (90; the booking screen is 60).
const Select = <Value,>({
  items,
  placeholder,
  className,
  'aria-label': ariaLabel,
  variant = 'default',
  ...props
}: SelectProps<Value>) => (
  <BaseSelect.Root items={items} {...props}>
    <BaseSelect.Trigger
      data-slot='select-trigger'
      data-variant={variant}
      aria-label={ariaLabel}
      className={cn(
        "flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 ps-2.5 pe-2 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === 'plain' &&
          'h-auto border-0 bg-transparent px-0 dark:bg-transparent dark:hover:bg-transparent',
        className,
      )}
    >
      <BaseSelect.Value
        data-slot='select-value'
        className='line-clamp-1 flex flex-1 items-center gap-1.5 text-start'
        placeholder={placeholder}
      />
      <BaseSelect.Icon render={<CaretDownIcon className='size-4 text-muted-foreground' />} />
    </BaseSelect.Trigger>
    <BaseSelect.Portal>
      <BaseSelect.Positioner className='isolate z-[90]' sideOffset={4} alignItemWithTrigger={false}>
        <BaseSelect.Popup
          data-slot='select-content'
          className='relative isolate max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
        >
          <BaseSelect.ScrollUpArrow className='top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1'>
            <CaretUpIcon className='size-4' />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List className='p-1'>
            {items.map((item) => (
              <BaseSelect.Item
                key={String(item.value)}
                value={item.value}
                disabled={item.disabled}
                data-slot='select-item'
                className='relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 ps-1.5 pe-8 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50'
              >
                <BaseSelect.ItemText className='flex flex-1 shrink-0 gap-2 whitespace-nowrap'>
                  {item.label}
                </BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className='pointer-events-none absolute end-2 flex size-4 items-center justify-center'>
                  <CheckIcon className='size-4' />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.List>
          <BaseSelect.ScrollDownArrow className='bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1'>
            <CaretDownIcon className='size-4' />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  </BaseSelect.Root>
)

export type { SelectItem, SelectProps }
export { Select }
